export interface Indicator {
  key: string;
  label: string;
  unit: string;
}

export interface Observation {
  key: string;
  value: string | number;
  period: string;
  source_url?: string;
}

export interface SurveyIndex {
  id: string;
  name: string;
  level: 'central' | 'state';
  body: string;
  frequency: string;
  indicators: Indicator[];
  observations: Observation[];
}

export const SURVEY_INDICES: { updated: string; surveys: SurveyIndex[] } = {
  updated: '2026-10',
  surveys: [
    {
      id: 'plfs',
      name: 'Periodic Labour Force Survey (PLFS)',
      level: 'central',
      body: 'MoSPI',
      frequency: 'Monthly / Quarterly / Annual',
      indicators: [
        { key: 'lfpr', label: 'Labour Force Participation Rate (LFPR)', unit: '%' },
        { key: 'wpr', label: 'Worker Population Ratio (WPR)', unit: '%' },
        { key: 'ur', label: 'Unemployment Rate (UR)', unit: '%' }
      ],
      observations: [
        { key: 'lfpr', value: '54.6', period: 'Quarter ending June 2026', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' },
        { key: 'wpr', value: '52.1', period: 'Quarter ending June 2026', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' },
        { key: 'ur', value: '4.5', period: 'Quarter ending June 2026', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' }
      ]
    },
    {
      id: 'cpi',
      name: 'Consumer Price Index (CPI)',
      level: 'central',
      body: 'MoSPI',
      frequency: 'Monthly',
      indicators: [
        { key: 'cpi_gen', label: 'General index (Base 2012=100)', unit: 'index' },
        { key: 'cpi_inf', label: 'Inflation rate (YoY)', unit: '%' }
      ],
      observations: [
        { key: 'cpi_gen', value: '192.4', period: 'September 2026', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' },
        { key: 'cpi_inf', value: '4.2', period: 'September 2026', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' }
      ]
    },
    {
      id: 'iip',
      name: 'Index of Industrial Production (IIP)',
      level: 'central',
      body: 'MoSPI',
      frequency: 'Monthly',
      indicators: [
        { key: 'iip_gen', label: 'General index (Base 2011-12=100)', unit: 'index' },
        { key: 'iip_gr', label: 'Growth rate (YoY)', unit: '%' }
      ],
      observations: [
        { key: 'iip_gen', value: '148.9', period: 'August 2026', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' },
        { key: 'iip_gr', value: '4.8', period: 'August 2026', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' }
      ]
    },
    {
      id: 'wpi',
      name: 'Wholesale Price Index (WPI)',
      level: 'central',
      body: 'Office of the Economic Adviser, DPIIT',
      frequency: 'Monthly',
      indicators: [
        { key: 'wpi_all', label: 'All commodities index', unit: 'index' },
        { key: 'wpi_inf', label: 'Inflation rate (YoY)', unit: '%' }
      ],
      observations: [
        { key: 'wpi_all', value: '154.2', period: 'August 2026', source_url: 'https://eaindustry.nic.in' },
        { key: 'wpi_inf', value: '1.8', period: 'August 2026', source_url: 'https://eaindustry.nic.in' }
      ]
    },
    {
      id: 'gdp',
      name: 'National Accounts (GDP)',
      level: 'central',
      body: 'MoSPI',
      frequency: 'Quarterly / Annual',
      indicators: [
        { key: 'gdp_gr', label: 'Real GDP growth (Constant 2011-12 prices)', unit: '%' }
      ],
      observations: [
        { key: 'gdp_gr', value: '6.7', period: 'Q1 2026-27 (Apr–Jun)', source_url: 'https://ipm.mospi.gov.in/Home/ShowPressRelease' }
      ]
    },
    {
      id: 'asuse',
      name: 'Annual Survey of Unincorporated Sector Enterprises (ASUSE)',
      level: 'central',
      body: 'MoSPI',
      frequency: 'Annual',
      indicators: [
        { key: 'asuse_gva', label: 'GVA per establishment', unit: 'INR' },
        { key: 'asuse_emp', label: 'Workers per establishment', unit: 'count' }
      ],
      observations: [
        { key: 'asuse_gva', value: '1,52,400', period: 'Survey Year 2023-24', source_url: 'https://ipm.mospi.gov.in' },
        { key: 'asuse_emp', value: '1.7', period: 'Survey Year 2023-24', source_url: 'https://ipm.mospi.gov.in' }
      ]
    },
    {
      id: 'hces',
      name: 'Household Consumption Expenditure Survey (HCES)',
      level: 'central',
      body: 'MoSPI',
      frequency: 'Periodic',
      indicators: [
        { key: 'mpce_r', label: 'Average MPCE, rural', unit: 'INR' },
        { key: 'mpce_u', label: 'Average MPCE, urban', unit: 'INR' }
      ],
      observations: [
        { key: 'mpce_r', value: '4,122', period: 'Factsheet 2023-24', source_url: 'https://ipm.mospi.gov.in' },
        { key: 'mpce_u', value: '6,988', period: 'Factsheet 2023-24', source_url: 'https://ipm.mospi.gov.in' }
      ]
    },
    {
      id: 'asi',
      name: 'Annual Survey of Industries (ASI)',
      level: 'central',
      body: 'MoSPI',
      frequency: 'Annual',
      indicators: [
        { key: 'asi_gva', label: 'Gross value added', unit: 'INR crore' },
        { key: 'asi_emp', label: 'Persons engaged', unit: 'count' }
      ],
      observations: [
        { key: 'asi_gva', value: '23,450', period: 'ASI 2022-23 (HP state total)', source_url: 'https://himachalservices.nic.in/economics/' },
        { key: 'asi_emp', value: '3,84,000', period: 'ASI 2022-23 (HP total)', source_url: 'https://himachalservices.nic.in/economics/' }
      ]
    },
    {
      id: 'hp-gsdp',
      name: 'State Economic Survey / GSDP (Himachal Pradesh)',
      level: 'state',
      body: 'HP Dept. of Economics & Statistics',
      frequency: 'Annual',
      indicators: [
        { key: 'gsdp_gr', label: 'GSDP growth (Constant prices)', unit: '%' },
        { key: 'pcnsdp', label: 'Per capita NSDP (Current prices)', unit: 'INR' }
      ],
      observations: [
        { key: 'gsdp_gr', value: '7.1', period: '2024-25 (First Advance)', source_url: 'https://himachalservices.nic.in/economics/' },
        { key: 'pcnsdp', value: '2,35,199', period: '2023-24 (Quick Estimates)', source_url: 'https://himachalservices.nic.in/economics/' }
      ]
    }
  ]
};
