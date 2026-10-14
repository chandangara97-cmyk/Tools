export interface ReportItem {
  org: 'MoSPI' | 'HP Statistics' | string;
  title: string;
  url: string;
  kind?: string;
  date?: string;
  note?: string;
  isNew?: boolean;
}

export interface UpcomingReport {
  date: string;
  org: string;
  title: string;
}

export interface ReportsData {
  generated: string;
  items: ReportItem[];
  pinned: ReportItem[];
  upcoming: UpcomingReport[];
  upcoming_source: string;
}

export const REPORTS_DATA: ReportsData = {
  generated: '2026-10-14T07:52:54+00:00',
  items: [
    {
      org: 'MoSPI',
      title: 'Quarterly Bulletin of Periodic Labour Force Survey (PLFS) – April to June 2026',
      url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease',
      date: '2026-08-28',
      kind: 'Bulletin',
      note: 'LFPR, WPR and UR quarterly trends across urban sectors and states.',
      isNew: true
    },
    {
      org: 'MoSPI',
      title: 'Consumer Price Index (CPI) numbers on Base 2012=100 for rural, urban and combined for September 2026',
      url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease',
      date: '2026-10-12',
      kind: 'Press release',
      note: 'All-India headline retail inflation stands at 4.2% YoY.'
    },
    {
      org: 'MoSPI',
      title: 'Quick Estimates of Index of Industrial Production (IIP) for August 2026 (Base 2011-12=100)',
      url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease',
      date: '2026-10-11',
      kind: 'Press release',
      note: 'Manufacturing, mining and electricity growth indicators.'
    },
    {
      org: 'HP Statistics',
      title: 'Economic Survey of Himachal Pradesh 2025-26',
      url: 'https://himachalservices.nic.in/economics/',
      date: '2026-02-18',
      kind: 'Survey Report',
      note: 'Comprehensive overview of state economic indicators, horticulture, tourism and public finances.'
    },
    {
      org: 'MoSPI',
      title: 'Estimates of Gross Domestic Product for the First Quarter (April-June) of 2026-27',
      url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease',
      date: '2026-08-31',
      kind: 'Press release',
      note: 'Real GDP at constant prices grew at 6.7% in Q1 2026-27.'
    }
  ],
  pinned: [
    {
      org: 'MoSPI',
      title: 'Advance Release Calendar 2026-27 (updated 25 May 2026)',
      url: 'https://www.mospi.gov.in/uploads/documents/releaseCalender/1779709510470-ADVANCE%20RELEASE%20CALENDAR%202026-27%20Updated%2025.05.2026.pdf',
      kind: 'Calendar',
      date: '2026-05-25',
      note: 'Planned release dates for GDP, IIP, CPI, PLFS and other major indicators.'
    },
    {
      org: 'MoSPI',
      title: 'MoSPI Press Releases & Announcements Portal',
      url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease',
      kind: 'Listing',
      date: '',
      note: 'Official press-release archive from the Ministry of Statistics and Programme Implementation.'
    },
    {
      org: 'MoSPI',
      title: 'PAIMANA Performance Dashboard',
      url: 'https://paimana-perf.mospi.gov.in',
      kind: 'Dashboard',
      date: '2026-04-16',
      note: 'Official performance and release monitoring dashboard for field surveys.'
    },
    {
      org: 'HP Statistics',
      title: 'Statistical Year Book of Himachal Pradesh 2022-23',
      url: 'https://himachalservices.nic.in/economics/pdf/YearBook2022-23.pdf',
      kind: 'Year book',
      date: '',
      note: 'Tables on area, population, agriculture, industry, power, education, health and municipal finances.'
    },
    {
      org: 'HP Statistics',
      title: 'Department of Economics & Statistics, HP — State Data Portal',
      url: 'https://ecostat.hp.gov.in/',
      kind: 'Portal',
      date: '',
      note: 'IIP, Village Level Directory and Employee Census services for Himachal Pradesh.'
    }
  ],
  upcoming: [
    { date: '2026-10-15', org: 'MoSPI', title: 'Monthly Bulletin of PLFS – September 2026' },
    { date: '2026-11-10', org: 'MoSPI', title: 'Quarterly Bulletin of PLFS – July to September 2026' },
    { date: '2026-11-15', org: 'MoSPI', title: 'Monthly Bulletin of PLFS – October 2026' },
    { date: '2026-11-30', org: 'MoSPI', title: 'Second Quarter (July-Sept) GDP Estimates 2026-27' }
  ],
  upcoming_source: 'MoSPI Advance Release Calendar 2026-27. Dates can change; confirm on official calendar.'
};
