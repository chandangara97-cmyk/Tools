import { esc, money } from '../components/CollectionPanel';
import { rupeesInWords } from '../services/collection';

export interface ThermalReceiptParams {
  town: string;
  headName: string;
  receiptNo: string;
  date: string;
  propertyId: string;
  ownerName: string;
  ward: string;
  houseNo?: string;
  payerName?: string;
  mode: string;
  refNo?: string;
  parts: { fy: string; principal: number; interest: number }[];
  amount: number;
  rebate?: number;
  balanceDueAfter: number;
  advanceCredit?: number;
  qrDataUrl?: string;
  cashierName?: string;
}

export function generateThermalReceiptHtml(p: ThermalReceiptParams, widthMm: 58 | 80 = 58): string {
  const is58 = widthMm === 58;
  const fontSize = is58 ? '10px' : '12px';
  const headerSize = is58 ? '13px' : '15px';
  const widthCss = is58 ? '54mm' : '76mm';

  const rows = p.parts
    .map(
      (part) =>
        `<tr><td>${esc(part.fy)}</td><td style="text-align:right">${money(part.principal)}</td><td style="text-align:right">${money(part.interest)}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${esc(p.receiptNo)}</title>
  <style>
    @page { size: ${widthMm}mm auto; margin: 2mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.25;
      margin: 0;
      padding: 2mm 0;
      width: ${widthCss};
      color: #000;
      background: #fff;
    }
    .c { text-align: center; }
    .r { text-align: right; }
    .b { font-weight: bold; }
    .h1 { font-size: ${headerSize}; font-weight: bold; margin: 0; }
    .h2 { font-size: ${fontSize}; font-weight: bold; margin: 2px 0 6px; }
    .sep { border-bottom: 1px dashed #000; margin: 5px 0; }
    .dsep { border-bottom: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: ${fontSize}; }
    td { padding: 1px 0; }
    .qr { margin: 6px auto; display: block; width: 110px; height: 110px; }
    .cut { margin-top: 15px; text-align: center; font-size: 9px; }
  </style>
</head>
<body>
  <div class="c">
    <div class="h1">${esc(p.town.toUpperCase())}</div>
    <div class="h2">MUNICIPAL COUNCIL / HP ULB</div>
    <div style="font-size:9px">DEPARTMENT OF REVENUE &amp; TAXATION</div>
  </div>

  <div class="dsep"></div>

  <table>
    <tr><td>RC NO:</td><td class="r b">${esc(p.receiptNo)}</td></tr>
    <tr><td>DATE:</td><td class="r">${esc(p.date)}</td></tr>
    <tr><td>PROP ID:</td><td class="r b">${esc(p.propertyId)}</td></tr>
    <tr><td>WARD:</td><td class="r">${esc(p.ward)}${p.houseNo ? ' / ' + esc(p.houseNo) : ''}</td></tr>
    <tr><td>OWNER:</td><td class="r">${esc(p.ownerName)}</td></tr>
    ${p.payerName && p.payerName !== p.ownerName ? `<tr><td>PAID BY:</td><td class="r">${esc(p.payerName)}</td></tr>` : ''}
    <tr><td>HEAD:</td><td class="r b">${esc(p.headName)}</td></tr>
    <tr><td>MODE:</td><td class="r">${esc(p.mode.toUpperCase())}${p.refNo ? ' (' + esc(p.refNo) + ')' : ''}</td></tr>
  </table>

  <div class="sep"></div>

  <table>
    <tr class="b"><td>PERIOD</td><td class="r">TAX</td><td class="r">INT</td></tr>
    ${rows}
  </table>

  <div class="sep"></div>

  ${p.rebate ? `<table><tr><td>Rebate Allowed:</td><td class="r">-${money(p.rebate)}</td></tr></table>` : ''}

  <table>
    <tr class="b" style="font-size:1.15em">
      <td>RECEIVED:</td>
      <td class="r">${money(p.amount)}</td>
    </tr>
  </table>
  <div style="font-size:8px; margin: 2px 0;">${esc(rupeesInWords(p.amount))}</div>

  <div class="sep"></div>

  <table>
    ${p.advanceCredit && p.advanceCredit > 0 ? `<tr class="b"><td>Advance Credit:</td><td class="r">${money(p.advanceCredit)}</td></tr>` : ''}
    <tr><td>Balance Due:</td><td class="r">${money(p.balanceDueAfter)}</td></tr>
  </table>

  ${p.qrDataUrl ? `<div class="c"><img src="${p.qrDataUrl}" class="qr" alt="QR Verify" /><div style="font-size:8px">Scan to verify digital receipt</div></div>` : ''}

  <div class="dsep"></div>

  <div class="c" style="font-size:9px; margin-top:6px">
    <div>Cashier: ${esc(p.cashierName || 'Authorized Counter')}</div>
    <div>Thank you for paying on time!</div>
    <div style="font-size:8px">Powered by CivicCollect HP 2026</div>
  </div>

  <div class="cut">--------------------------------</div>
</body>
</html>`;
}

export interface TaxClearanceCertificateParams {
  town: string;
  certificateNo: string;
  date: string;
  financialYear: string;
  propertyId: string;
  ownerName: string;
  ward: string;
  houseNo?: string;
  address?: string;
  use: string;
  builtUpSqM: number;
  qrDataUrl?: string;
  signatoryTitle?: string;
}

export function generateTaxClearanceCertificateHtml(c: TaxClearanceCertificateParams): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Clearance NOC - ${esc(c.propertyId)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13px;
      color: #111;
      margin: 0;
      padding: 10px;
      line-height: 1.5;
    }
    .frame {
      border: 4px double #1a365d;
      padding: 24px;
      position: relative;
      background: #fdfdfd;
    }
    .crest {
      text-align: center;
      margin-bottom: 12px;
    }
    .crest h1 {
      font-size: 24px;
      margin: 0;
      color: #1a365d;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .crest h2 {
      font-size: 15px;
      margin: 4px 0 0;
      color: #4a5568;
      font-weight: normal;
    }
    .crest h3 {
      font-size: 13px;
      margin: 2px 0 16px;
      color: #718096;
      text-transform: uppercase;
    }
    .title-box {
      background: #1a365d;
      color: #fff;
      text-align: center;
      padding: 8px 16px;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 10px auto 20px;
      width: 75%;
      border-radius: 4px;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .cert-body {
      font-size: 14px;
      text-align: justify;
      margin: 20px 0;
      line-height: 1.8;
    }
    .prop-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0 25px;
    }
    .prop-table td, .prop-table th {
      border: 1px solid #cbd5e0;
      padding: 8px 12px;
    }
    .prop-table th {
      background: #edf2f7;
      text-align: left;
      font-weight: bold;
      width: 32%;
    }
    .footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .seal-box {
      text-align: center;
      border: 2px dashed #a0aec0;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #718096;
      border-radius: 50%;
    }
    .sig-box {
      text-align: center;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 72px;
      color: rgba(26, 54, 93, 0.05);
      font-weight: bold;
      pointer-events: none;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="watermark">TAX CLEARED • NOC</div>

    <div class="crest">
      <h1>${esc(c.town.toUpperCase())} MUNICIPAL COUNCIL</h1>
      <h2>GOVERNMENT OF HIMACHAL PRADESH • URBAN DEVELOPMENT DEPARTMENT</h2>
      <h3>OFFICE OF THE MUNICIPAL COMMISSIONER / EXECUTIVE OFFICER</h3>
    </div>

    <div class="title-box">
      PROPERTY TAX CLEARANCE CERTIFICATE (NOC)
    </div>

    <table class="meta-table">
      <tr>
        <td><strong>Certificate No:</strong> ${esc(c.certificateNo)}</td>
        <td style="text-align:right"><strong>Date of Issue:</strong> ${esc(c.date)}</td>
      </tr>
      <tr>
        <td><strong>Financial Year:</strong> ${esc(c.financialYear)}</td>
        <td style="text-align:right"><strong>Validity:</strong> Valid up to 31st March 2027</td>
      </tr>
    </table>

    <div class="cert-body">
      This is to certify that the property detailed hereunder situated within the territorial municipal jurisdiction of <strong>${esc(c.town)}</strong> has <strong>CLEARED ALL OUTSTANDING TAXES, RATES, AND CIVIC CHARGES</strong> up to date. As per the municipal revenue registers, there are zero pending arrears or interest liabilities against this property as on <strong>${esc(c.date)}</strong>.
    </div>

    <table class="prop-table">
      <tr>
        <th>Property Unique ID (UPN):</th>
        <td><strong>${esc(c.propertyId)}</strong></td>
      </tr>
      <tr>
        <th>Recorded Owner Name:</th>
        <td><strong>${esc(c.ownerName)}</strong></td>
      </tr>
      <tr>
        <th>Ward Number &amp; Location:</th>
        <td>Ward ${esc(c.ward)}${c.houseNo ? ', House/Plot No. ' + esc(c.houseNo) : ''}</td>
      </tr>
      <tr>
        <th>Property Address / Mohalla:</th>
        <td>${esc(c.address || c.town)}</td>
      </tr>
      <tr>
        <th>Authorized Usage Category:</th>
        <td>${esc(c.use)}</td>
      </tr>
      <tr>
        <th>Total Built-Up Area:</th>
        <td>${c.builtUpSqM} sq. meters</td>
      </tr>
      <tr>
        <th>Liability Status:</th>
        <td><span style="color:#047857; font-weight:bold;">NIL DUES (CLEARANCE ISSUED)</span></td>
      </tr>
    </table>

    <div style="font-size:12px; color:#4a5568; margin-top:10px;">
      <em>Note: This certificate is issued for official purposes including property mutation, registry verification, utility connections, and bank collateral. It remains valid subject to regular assessment in subsequent financial years.</em>
    </div>

    <div class="footer">
      <div>
        ${c.qrDataUrl ? `<img src="${c.qrDataUrl}" style="width:110px;height:110px" alt="QR" /><div style="font-size:10px;color:#718096">Digital Verification Code</div>` : '<div class="seal-box">MUNICIPAL<br>SEAL</div>'}
      </div>
      <div class="seal-box">
        MUNICIPAL<br>STAMP &amp; SEAL
      </div>
      <div class="sig-box">
        <div style="height:48px"></div>
        <div style="border-top:1px solid #111; width:220px; padding-top:4px; font-weight:bold;">
          ${esc(c.signatoryTitle || 'Executive Officer / Commissioner')}
        </div>
        <div style="font-size:11px; color:#4a5568;">Municipal Council ${esc(c.town)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
