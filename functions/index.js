
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();

const db = admin.database();
const HEADS = ['water', 'garbage', 'sewerage', 'electricity', 'other'];

const nowIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fyOf = (d) =>
  d.getMonth() >= 3
    ? `${d.getFullYear()}-${String(d.getFullYear() + 1).slice(-2)}`
    : `${d.getFullYear() - 1}-${String(d.getFullYear()).slice(-2)}`;

const periodOf = (frequency, d) =>
  frequency === 'monthly'
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    : fyOf(d);

const ledgerKey = (head, pid) =>
  head === 'property_tax' ? pid : `${head}~${pid}`;

const unitTargets = (head, props) => {
  if (head !== 'garbage') return props;
  const out = [];

  for (const p of props) {
    const units =
      p.units && typeof p.units === 'object'
        ? Object.entries(p.units).filter(
            ([, u]) => u && typeof u === 'object'
          )
        : [];

    if (!units.length) {
      out.push(p);
      continue;
    }

    for (const [uid, u] of units) {
      if (u.active !== false) {
        out.push({
          ...p,
          id: `${p.id}~${uid}`,
          use: u.use === 'Commercial' ? 'Commercial' : 'Residential'
        });
      }
    }
  }

  return out;
};

const useRate = (rates, use) =>
  use === 'Residential'
    ? rates?.residential
    : use === 'Commercial'
      ? rates?.commercial
      : null;

/**
 * Scheduled recurring demand generator.
 * Disabled until billingAutomation/enabled is explicitly set to true.
 */
exports.generateRecurringBills = onSchedule(
  {
    schedule: '15 2 * * *',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1'
  },
  async () => {
    const cfgSnap = await db.ref('billingAutomation').get();
    const cfg = cfgSnap.val() || {};

    if (cfg.enabled !== true) {
      logger.info(
        'Recurring billing skipped: billingAutomation/enabled is not true.'
      );
      return;
    }

    const today = new Date();
    const date = nowIso(today);
    const month = today.getMonth() + 1;
    const fy = fyOf(today);

    const results = {
      towns: 0,
      created: 0,
      skipped: 0,
      noRate: 0
    };

    const [propsSnap, ratesSnap, assessmentsSnap, ulbsSnap] =
      await Promise.all([
        db.ref('properties').get(),
        db.ref('payableRates').get(),
        db.ref('assessments').get(),
        db.ref('ulbs').get()
      ]);

    const allProps = propsSnap.val() || {};
    const allRates = ratesSnap.val() || {};
    const allAssessments = assessmentsSnap.val() || {};
    const ulbs = ulbsSnap.val() || {};
    const multi = {};

    for (const [town, wardOrProps] of Object.entries(allProps)) {
      const townCfg = cfg.towns?.[town];

      if (
        townCfg?.enabled === false ||
        ulbs[town]?.billingEnabled === false
      ) {
        continue;
      }

      results.towns++;

      const ratesByHead = allRates[town] || {};
      const townProps = [];

      for (const [ward, wardData] of Object.entries(wardOrProps || {})) {
        if (!wardData || typeof wardData !== 'object') continue;

        for (const [id, p] of Object.entries(wardData)) {
          if (!p || typeof p !== 'object' || !p.id) continue;

          townProps.push({
            id: String(p.id || id),
            use: p.use || '',
            ward: String(p.ward || ward),
            units: p.units
          });
        }
      }

      if (month === 4 && townCfg?.propertyTax !== false) {
        const approved = allAssessments[town]?.[fy] || {};

        for (const [pid, a] of Object.entries(approved)) {
          if (
            a?.status !== 'approved' ||
            !(Number(a?.calc?.tax) > 0)
          ) {
            continue;
          }

          const path = `ledger/${town}/${ledgerKey('property_tax', pid)}`;
          const demandId = `demand_${fy}`;
          const prior = await db.ref(`${path}/${demandId}`).get();

          if (prior.exists()) {
            results.skipped++;
            continue;
          }

          multi[`${path}/${demandId}`] = {
            type: 'demand',
            fy,
            amount: Number(a.calc.tax),
            date,
            at: Date.now(),
            by: 'system-recurring-billing',
            rateTableId: a.rateTableId || '',
            note: 'Automatically generated from approved assessment'
          };

          results.created++;
        }
      }

      for (const head of HEADS) {
        const rates = ratesByHead[head];
        if (!rates) continue;

        const frequency =
          rates.frequency === 'monthly' ? 'monthly' : 'yearly';

        if (frequency === 'yearly' && month !== 4) continue;
        if (townCfg?.heads?.[head] === false) continue;

        const period = periodOf(frequency, today);

        for (const p of unitTargets(head, townProps)) {
          const amount = useRate(rates, p.use);

          if (
            typeof amount !== 'number' ||
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            results.noRate++;
            continue;
          }

          const path = `ledger/${town}/${ledgerKey(head, p.id)}`;
          const demandId = `demand_${period}`;
          const fullPath = `${path}/${demandId}`;
          const prior = await db.ref(fullPath).get();

          if (
            prior.exists() ||
            Object.prototype.hasOwnProperty.call(multi, fullPath)
          ) {
            results.skipped++;
            continue;
          }

          multi[fullPath] = {
            type: 'demand',
            fy: period,
            amount,
            date,
            at: Date.now(),
            by: 'system-recurring-billing',
            source: 'fixed',
            note: `Automatically generated ${frequency} ${head} bill (${p.use})`
          };

          results.created++;
        }
      }
    }

    const paths = Object.keys(multi);

    for (let i = 0; i < paths.length; i += 300) {
      const chunk = {};

      for (const path of paths.slice(i, i + 300)) {
        chunk[path] = multi[path];
      }

      await db.ref().update(chunk);
    }

    if (paths.length) {
      await db.ref(`billingAutomationRuns/${date}`).set({
        date,
        ...results,
        at: Date.now(),
        status: 'completed'
      });
    }

    logger.info('Recurring billing run finished', {
      date,
      ...results
    });
  }
);

/**
 * Reset a login password.
 * Platform owner (ulb="*") can reset any login.
 * A ULB admin can reset logins belonging to their own ULB.
 */
exports.resetLoginPassword = onCall(
  { region: 'asia-south1' },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.');
    }

    const { uid, password } = req.data || {};

    if (
      typeof uid !== 'string' ||
      !uid ||
      typeof password !== 'string' ||
      password.length < 6 ||
      password.length > 128
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Give a login and a password of 6 to 128 characters.'
      );
    }

    const [meSnap, targetSnap] = await Promise.all([
      db.ref(`users/${req.auth.uid}`).get(),
      db.ref(`users/${uid}`).get()
    ]);

    const me = meSnap.val() || {};
    const target = targetSnap.val();

    if (me.role !== 'admin' || !me.ulb) {
      throw new HttpsError(
        'permission-denied',
        'Only an admin can reset passwords.'
      );
    }

    if (!target) {
      throw new HttpsError('not-found', 'No such login.');
    }

    if (
      me.ulb !== '*' &&
      (target.ulb !== me.ulb || target.ulb === '*')
    ) {
      throw new HttpsError(
        'permission-denied',
        'That login belongs to another ULB.'
      );
    }

    await admin.auth().updateUser(uid, { password });

    if (target.ulb && target.ulb !== '*') {
      await db.ref(`audit/${target.ulb}`).push({
        at: Date.now(),
        by: req.auth.uid,
        action: 'password-reset',
        detail: `Password reset for ${String(
          target.email || uid
        ).split('@')[0]}`
      });
    }

    logger.info('Password reset', {
      by: req.auth.uid,
      target: uid
    });

    return { ok: true };
  }
);

/**
 * Permanently delete a Firebase Authentication account.
 *
 * Platform owner (ulb="*") can delete other accounts.
 * A ULB admin can delete accounts only within their own ULB.
 * The currently signed-in account cannot delete itself.
 */
exports.deleteAuthLogin = onCall(
  { region: 'asia-south1' },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.');
    }

    const uid = req.data?.uid;

    if (typeof uid !== 'string' || !uid.trim()) {
      throw new HttpsError(
        'invalid-argument',
        'Choose a user to delete.'
      );
    }

    if (uid === req.auth.uid) {
      throw new HttpsError(
        'failed-precondition',
        'You cannot delete the account you are currently using.'
      );
    }

    const meSnap = await db.ref(`users/${req.auth.uid}`).get();
    const me = meSnap.val() || {};

    if (me.role !== 'admin' || !me.ulb) {
      throw new HttpsError(
        'permission-denied',
        'Only an authorized admin can delete login accounts.'
      );
    }

    const targetSnap = await db.ref(`users/${uid}`).get();
    const target = targetSnap.val();

    if (!target) {
      throw new HttpsError(
        'not-found',
        'No matching application user record was found.'
      );
    }

    if (
      me.ulb !== '*' &&
      (target.ulb !== me.ulb || target.ulb === '*')
    ) {
      throw new HttpsError(
        'permission-denied',
        'You can delete accounts only from your own ULB.'
      );
    }

    if (
      target.role === 'admin' &&
      target.ulb === '*' &&
      me.ulb !== '*'
    ) {
      throw new HttpsError(
        'permission-denied',
        'A ULB admin cannot delete the platform owner.'
      );
    }

    // Delete the actual Firebase Authentication account.
    try {
      await admin.auth().deleteUser(uid);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        logger.error('Authentication deletion failed', {
          by: req.auth.uid,
          target: uid,
          error: e.message
        });

        throw new HttpsError(
          'internal',
          'Firebase Authentication deletion failed.'
        );
      }
    }

    const email = String(target.email || '');
    const userId = email.toLowerCase().endsWith('@propertytax.app')
      ? email.slice(0, -'@propertytax.app'.length).toUpperCase()
      : '';

    const patch = {
      [`users/${uid}`]: null
    };

    if (
      target.ulb &&
      target.ulb !== '*' &&
      userId &&
      /^[A-Z0-9_-]{1,80}$/.test(userId)
    ) {
      patch[`loginDirectory/${target.ulb}/${userId}`] = null;

      patch[`audit/${target.ulb}/${Date.now()}`] = {
        at: Date.now(),
        by: req.auth.uid,
        action: 'auth-user-deleted',
        detail: `Deleted Firebase Authentication account ${userId}`
      };
    }

    await db.ref().update(patch);

    logger.info('Firebase Authentication account deleted by admin', {
      by: req.auth.uid,
      target: uid,
      ulb: target.ulb || null
    });

    return { ok: true, uid };
  }
);
