// Sample Shimla / Baddi Block Boundaries & Listings
export interface BlockDescItem {
  Name: string;
  WardNo: string;
  BlockNumber: string;
  North: string;
  East: string;
  South: string;
  West: string;
}

export interface BlockListingItem {
  structure: string;
  owner: string;
  households: string;
  landmark: string;
  ivUnit: string;
  wardNo: string;
  blockNo: string;
}

export const SAMPLE_BLOCK_DESCRIPTIONS: BlockDescItem[] = [
  {
    "Name": "",
    "WardNo": "",
    "BlockNumber": "",
    "North": "",
    "East": "",
    "South": "",
    "West": ""
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "16",
    "BlockNumber": "2",
    "North": "Starting from Abber Foil Estate moving along the road covering Abby Feale up to Auckland Tunnel (excluded) Starting from Keyman Qtrs covering tea shop, shed moving along the ward boundary covering Cradon Cottage, N G Vidhyamandir Hostels (both girls and boys) up to mobile tower along the ward boundary then covering Jakhu Ropeway Cafereria, Jakhoo Mandir, Museum up to Cafe under the tree.",
    "East": "From Cafe under the tree moving along the ward boundary covering Dhaulpur Lodge, adventure park then moving along the ward boundary up to Jakhu Temple main entrance and Baba Balak Nath Mandir.",
    "South": "From Baba Balak Nath Mandir moving along the ward bundary via road up to five benches (excluded) and then moving along the imaginary ward boundary to the point where ward 15 and 16 meets on the road.",
    "West": "From this point moving along the road covering Titla Hotel and then towards Keyman Qtrs and then along the jungle area towards Kendriya Vidyalaya (excluding), then from here covering Pump House Snow Down, Theog House, Gupta Cottage, Inder Prastha Bhawan and then down towards road along the Married Doctors Hostel (excluded) and then moving along the road up to Shop 1 Chauhan Chana Shop along the ward boundary via road up to Abber Foil Estate which is the point of start."
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "14",
    "BlockNumber": "14",
    "North": "Starting from Ajivika Bhawan covering HPMC shops and under construction hotel moving towards mall road covering house of Suresh Sharma and Rakesh Sharma, Tribune Office, Amar Niwas up to Lakhan Pal Dental Clinic",
    "East": "From Lakhan Pal Dental Clinic moving along the ward boundary from behind Comberemere Hotel (excluding) to Lal and Sons on mall road and then moving down along the road covering Willow Bank, Hotel 1871, Red Tape Showroom (Earlier Wax Museum), Hotel Rock Sea, HP HC Parking, Clarkes Hotel, Sudhar Griaha Utpada Himkara up to Type III Qtrs Oatland",
    "South": "From this point covering all Oatland Qtrs moving down to main road via stairs near Oatland Qtrs then moving towards ARTRAC Oatland covering Hotel Sansar, Office of Advocate General, High Court HP up to HPTDC Hotel (excluded)",
    "West": "From this point moving along the road and ward boundary towards Ajivika Bhawan covering Hotel Crystal Palace and Vidhayak Sadan which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "14",
    "BlockNumber": "3",
    "North": "Starting from CPWD Garden covering Redfor Villa, Servant Qtrs of Justice Building up to HPTDC Holiday Home",
    "East": "From HPTDC Holiday Home moving towards Hotel Aroma and then down towards Udhyog Bhawan, parking, Vigyan Bhawan, then from behind Oatland, HP Court (excluding all) up to Green Hotel then along the road up to Rickshaw shed and labor hostel H",
    "South": "From Labor Hostel H moving along the road covering Hotel Marina, Windosr Hotel, PNB Holiday Home, Thakur Niwas, and up to house of Mangat Ram Kuthiala and then down up to New Bemloe Store",
    "West": "From New Bemloe Store, moving along the road covering CPWD Bunglows up to CPWD Garden and Redfor Villa which is the point of start."
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "15",
    "BlockNumber": "12",
    "North": "Starting from CPWD Qtrs Block 3 moving along the road towards CPWD Qtrs Block 29 then moving along the nala to road (up to)",
    "East": "From this point on the road moving along the road covering block to be dismantled then further along up to ward boundary",
    "South": "From this point moving along the imaginary ward boundary up to point opposite Hotel Marina (excluded) then moving along the road upwards to Him Innovate Incubation Centre",
    "West": "From Him Innovate Incubation Centre moving along the road covering CPWD Qtrs Block 32 and Block 30 and then up to CPWD Qtrs Block 3 which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "14",
    "BlockNumber": "16",
    "North": "Starting from Fever Block (opp Arya Samaj Mandir, excluded) moving towards DC office via path covering Butail Pyau, Makeup Bazar, house of Sanjeev Kuthiala, Asihana Furnisher, Puran Chand Satya Paul Khanna up to Micro Bridge Computers",
    "East": "From Micro Bridge Computers moving towards Sabji market covering Delhi Stores Plus, Rajkiya Ayurvedic Swasthya Kendra, Sohan House, Pyau, GAB, Bata Showroom, Janata Watch Company, AL Sachdeva Clinic, up to Sundar das and sons. Then moving down towards Ganj Bazar, covering Chetan Wool house, house of RS Ahuja, then down the stairs near Dhaba, then towards road covering Naturals Guest House up to the main road.",
    "South": "From main road moving along the ward boundary via main road up to stairs leading to Janata Coal Company Office (excluded), covering, Baba Kahan Store, Salig Ram Hem Raj, Himachal Electric and Mill Store, MC Qtrs, house of Bhag Singh, Shila Devi, Public Toilets, PNB up to CMO Line",
    "West": "From CMO Line moving along the road towards lower bazar covering Fever Block Makeup Bazar which is the point of start."
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "14",
    "BlockNumber": "21",
    "North": "Starting from Hari Furniture Industries (Hari Niwas) moving towards Malhotra Niwas (LK Malhotra) and then along the road towards Mall road covering shops on right including Shimla Fancy Store, Janata Bakery up to fruit vendors (with shops near bartan store) near Qutub Masjid (on the path to sabzi mandi).",
    "East": "From Fruit vendors moving down covering Qutab Masjid, and then moving to the path towards Thana (excluding) and then moving down towards house of Sameer Nath. From this point moving down along the nala to main road up to main road",
    "South": "From this point on main road moving up through stairs covering Hotel Mahamaya, House of Kedar Nath, Tula Ram, Green Cottage, Bhatnagar House up to Sood Daily Need Shop.",
    "West": "From Sood daily need shop moving along the path towards lower bazaar up to Hari Niwas which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "16",
    "BlockNumber": "8",
    "North": "Starting from Hotel Ashoka moving along the imaginary boundary covering Hotel Amar, KV School, KV Staff Qtrs, and then through the jungle area upto ward boundary",
    "East": "From ward boundary moving along the ward boundary up to public toilets. From public toilets moving along the road covering Lineman Qtrs, HPSEB Sub-station, then covering the ground adjoining Rhotney Castle (up to)",
    "South": "From Rhotney Castle moving down covering Anand Lodge, PDS Shop, then covering Ramesh Bhawan, Holly Lodge up to Le Royale Hotel.",
    "West": "From Le Royale Hotel moving along the road covering Chitkara Art Studio, Dreamland Building, Ashoka Estate, Aandhi Bhawan, Neelkanth Building up to Hotel Ashoka which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "15",
    "BlockNumber": "13",
    "North": "Starting from house of Manju Comar, Raymond Showroom moving along the mall road covering Kevin Grove main entrance then upwards the road after a sharp turn near AU Fin Bank (excluded) and moving along the road up to back side of Kevin Grove",
    "East": "From this point moving along the road covering the rear entrance of Kevin Grove, Hotel Eve and then further down the road up to ward boundary covering ECI Chalet Day School",
    "South": "From this point moving along the road towards Mall road covering hotel on the right including Shimla Rotary Club, Rotary Vocational Centre, Hotel Sangeet up to Hotel Chandan",
    "West": "From Hotel Chandan moving along the mall road covering Hotel Le Talbot, Hotel Prashant up to Raymond Showroom and house of Manju Comar which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "16",
    "BlockNumber": "6",
    "North": "Starting from HP State Library and moving upwards the road covering Sidhowal Lodge up to DC Residence (entrance of servant qtrs) then towards house of BD Thapar up to the house of Ramesh Gangotra",
    "East": "From house of Ramesh Gangotra moving along the road covering all the houses on the right side up to house of NK Gupta (Nav Bhawan, excluded) and then along an imaginary boundary behind the servant quarters then along the path towards Dogra Bhawan and Dogra Niwas (both included, up to)",
    "South": "From Dogra Niwas moving along the stairs towards the parking (included) then moving towards Mall Road covering Alice Mount, house of LD Sood, Ritz, Brew Estate up to Residence of Church School In Charge",
    "West": "From residence of Church School In Charge moving towards HP State library covering Church up to the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "15",
    "BlockNumber": "11",
    "North": "Starting from IAS Subhash Ahluwalia Residence opposite the Office of DD Higher Education (excluding) moving along the road towards Jakhu Ropeway (excluding) and moving along the road covering IPH Office and up to IPH Qtrs",
    "East": "From IPH Qtrs moving along the road covering DGP Guard Qtrs up to point above Block 4.",
    "South": "From this point moving down along the nala covering Block 4 and then down to the road covering Shiv Mandir US Shimla Club Lodge 2 (up to)",
    "West": "From Shimla Club Lodge 2 moving along the road towards Mall road then moving up the road (opp to Working Women Hostel excluding) then towards Shimla Heritage Museum covering it and Saksham Gudia Board Office and shed up to house of IAS Subhash Ahluwalia which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "14",
    "BlockNumber": "15",
    "North": "Starting from IndusInd ATM opposite Sood Dharamshala Mahavir Block Entrance Gate moving along the stairs towards DC Office then moving down towards Lower bazar covering shops on the right including JBD Mobile Spot, Bengal and Madras Stores, Dr Jagat Ram Clinic, Arya Samaj Mandir, Ganpati Traders up to Sunny Collection then down along the path covering mini Make Up Bazar, Daulat Ram Jagdish Ram up to Jagat Guru Mandir",
    "East": "From Jagat Guru Mandir moving along the path covering Paras Medical Store, DDUH Pharmacist Qtrs, Hotel Vineration, Parking, Waqf Board Bldg up to Moti Masjid",
    "South": "From Moti Masjid moving down the stairs to lower bazaar and then moving along the path covering Hotel Kohinoor, Hotel Basant, DDUH Dai Block, along the ward boundary up to Milap Dhaba",
    "West": "From Milap Dhaba moving upwards the stairs covering Dogar and Co, Sagar Medical, then towards Sood Dharamshala main gate. From this point moving upwards along the path up to IndusInd ATM which is the point of start."
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "15",
    "BlockNumber": "17",
    "North": "Starting from Jain Dharamshala moving along the path covering Jain Mega Mart, New OK Dhaba, Tangri Jewellers, Jain Clinic, Seven Skies Salon, Lakme Academy, Mahadev Jewellers, Canara Bank, Rainbow Dupatta Center, Family Choice Luggage, Quality Attache Works, Chung Fa Chinese Food, Shimla Diagnostic Centre, then moving up to Mall road covering Khadi India, Public Toilets, Duli Chand and Bros, La Pino Restaurant, Hans Jewellers, Moms Choice, Fathers Choice, up to rain shelter",
    "East": "From rain shelter moving down the path covering Manu Shawl Centre, Export Surplus, Amritsarian di Hatti, up to Brahman Sabha",
    "South": "From Brahman Sabha moving along the path towards Jain Mandir (exlcluded), covering Shyam Jewellers, Jeewan Khanna, Raj Kunj (Harish Kashyap), Walia Computers, Taneja Home Decor, Amarjeet Ahuja, Soltare Jewellers, Bhai Avatar Singh Khalsa Gurudwara, up to Lok Mitra Kendra",
    "West": "From Lok Mitra Kendra moving towards Jain Dharamshala covering Shree Radhey Jewellers, Channa Music Academy, Hans Lal Sari up to Jain Dharamshala which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "16",
    "BlockNumber": "18",
    "North": "Starting from Nav Bhawan (N K Gupta) covering Walia Cottage, Harsh Cottage, Asha Deep, Sah Sadan up to Bali Ram Sharma Shop",
    "East": "From Bali Ram Sharma Shop moving along the road covering Sharma Bhojanalaya, CM Sharma (Grace Cottage), A and A BnB, PHC Jakhoo, Gaitry Cottage, Sodhi Estate and then up to MC Parking near Nala",
    "South": "From MC Parking near nala moving from behind along the nala up to house of Sarb Sukh (Bobby Villa) and A K Bhatia then moving along the path towards City View and covering Tomar House and disputed Townsend building, Rohini Niwas, Mid Wood up to Hotel Woodland. Then moving along the pucca path covering Krishna Kutir, Minocha Niwas and up to Dainik Jagran Office",
    "West": "From Dainik Jagran Office moving towards covering Bodh Kunj, Nera Villa Cottage (Hemendra Singh) then along the kutcha path and then from behind the servant qtrs upwards up to NK Gupta (Nav Bhawan) along the imaginary boundary which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "16",
    "BlockNumber": "9",
    "North": "Starting from NIELIT Regional Computer Centre moving along the stairs upwards to Oakwood Place then covering all building to the right along the road up to Verma Apartments Block C",
    "East": "From Verma Apartments Block C moving along the road down towards MC Parking (excluded) up to Amar Bhawan",
    "South": "From Amar Bhawan moving along the road covering every building on the right including Sehgal Cottage, Rupankush up to Sarna Cottage",
    "West": "From Sarna Cottage, moving along the road covering Padma Aptmt, Kang Cottage, Kalp Taru Building up to NIELIT RCC which is point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "16",
    "BlockNumber": "7",
    "North": "Starting from Police Chowki moving along the road covering all houses and structures on right towards Doctors Colony up to Married Doctors Hostel Block C",
    "East": "From Married Doctors Hostel Block C covering IGMC Staff Qtrs Type II, PWD Store room moving along the KV boundary (excluding) up to Karst Hopen Block 1",
    "South": "From Karst Hopen moving along the road covering IGMC Type I Qtrs then towards Public Toilets then towards Regal Building (Raman Khanna) and up to Takka Bench covering Book Cafe",
    "West": "From Book Cafe moving down to ridge and then towards IGMC covering Police Post, Toilets up to Police Chowki which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "15",
    "BlockNumber": "1",
    "North": "Starting from rain shelter moving along the road covering MES Inspection Bunglow, Railway Board Building, SBI Main branch, SBI house, Atul Chitkara, Tanishq Jewellers (Janaki Das Building), Canara Bank up to HP Cooperative Bank",
    "East": "From HP Cooperative Bank moving down the Nathu Ram Stairs up to Paul Collection near Thuniya Mal Medicos (excluded), then moving towards DC Office upwards and then moving along the road towards old bus stand near St Michael Church (excluded) up to main raod",
    "South": "From Main Road moving along the road which is also the ward boundary up to Victory Tunnel",
    "West": "From Victory Tunnel moving along the road towards Railway Board Building up to the point of start i.e. rain shelter"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "15",
    "BlockNumber": "19",
    "North": "Starting from road Near Rani Jhansi Park (Excluded Church, Ritz Cinema), Dada Dadi Park, Shani Shiv Mandir, Ved Kanta Welfare Society up to PC Chambers",
    "East": "From PC Chambers moving down the path towards Richmound through the gate covering house of Vinay Kuthiala, partially demolished building then along the road up to the Office of DD Higher Education",
    "South": "From the office of DD Higher Education moving along the road covering PWD Qtrs then descending down from the path near canteen and parking opposite Shimla Heritage Muesum (excluded) then moving down towards Mall road up to Working Women Hostel",
    "West": "From Working Women Hostel moving further down towards Mall road covering AU Small Finance Bank, PNB, Argyle House, IG Khel Parisar, Sub Post Office, then covering HPTDC Lift, Hotel Combermere, Kalra Commercial Complex, Smile Dental Clinic, (along the path leading to house of Rakesh Sharma, excluding) New Shimla Wholesale Mart, Hoshiarpuri Jewellers then up to the end of shops in this line. From the last shop moving upwards to Mall road covering houses and shops on right and then taking a u-turn near Rani Jhansi Park and from here moving to road which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "14",
    "BlockNumber": "20",
    "North": "Starting from Sadar Thana moving towards lower bazar and then moving up on road (other road above sabji mandi) up to Kashmiri Masjid then again moving down along the path after a u-turn walking up to newly constructed shed shops.",
    "East": "From these shops moving down along the road covering Fish Market, Egg Market, Meat market up to main road",
    "South": "Moving along the main road covering SJPNL Qtrs up to Usha Trading Co on main road up to Laj Bhawan",
    "West": "From Laj Bhawan moving along the nala between Laj Bhawan and Hotel Mahamaya (excluded) up to Sadar Thana which is point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "15",
    "BlockNumber": "5",
    "North": "Starting from Sheel Silver House, Golcha Dhaba moving along the main road covering Mayor Office, Lalit Kala Akadamy, Daulat Singh Park, Goofa Ashiana Restaurant, HPMC Canteen up to Church (excluded)",
    "East": "From Church (excluded) descending down along the path near Rani Jhansi Ladies Park (excluded) covering Safai Majdoor Union Office, Assistant Engineer Office, SBM Control Room up to rain shelter.",
    "South": "From Rain shelter moving along the road towards Scandal point up to DCAR Casuals (Near Rubina Diagnostic Centre), then moving down the stairs to Sanjay Traders then covering Comarsons, Hari Hair Dresser, MC Shopping complex, and then moving along the ward boundary covering Bhasin Traders, Albert Lodge, A B Lall and Sons, Rivoli Tunnel, house of Satya Paul Sood, BR Sood and Himachal Binding and Press up to Thunia Mull Medical Store",
    "West": "From Thunia Mull Medical Store moving along the stairs towards mall road up to Sheel Silver House which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "14",
    "BlockNumber": "4",
    "North": "Starting from St Michael Cathedral Church moving upwards towards DC Office (covering it) up to Saurav Photocopiers covering Lekhu Raj Sharma Food Corner",
    "East": "From Saurav Photocopiers moving down along the stairs towards bazaar area up to Siri Ram Deepak Kumar Sai Enterprises sweets shop then moving down along the path covering shops on right including Meher Chand and Sons, Yash Electricals, Mini Binding house, Ram Mandir up to Panchayat Bhawan",
    "South": "From Panchayat Bhawan moving along the main road towards ISBT covering Raya Sahib Puran Mal Dharamshala up to Ranjan Hotel",
    "West": "From Ranjan Hotel moving up via road covering Vidyapeeth Coaching, temporary Shops, St Thomas School up to St Michael Cathedral Church which is the point of start"
  },
  {
    "Name": "Abhimanyu",
    "WardNo": "16",
    "BlockNumber": "10",
    "North": "Starting from Yodha Niwas (Kamal General Store) moving along the path behind Bodh Kunj (exlucded) covering Hotel Atithi, PDS Shop, house of Adesh Jain, Sachdeva Bhawan up to Daisy Bank Estate (opp Hotel Woodland, excluded) moving along the nala covering Hotel Shivalik Regency, Jakhoo Ropeway then covering Abergledle Estate (Sunrise Building - Kuthialas) and then moving along the nala upwards to old buildings of Kuthialas then up to Bonivoon Building on the road",
    "East": "From Bonivoon Building moving along the road covering Type VI Set 6 and Set 3 (including guard hut) up to closed garage on the road",
    "South": "From garage moving along the road covering Block 1 Type IV, Set 7 Type V up to garage located at end of nala",
    "West": "From garage moving along the road covering all building on the right towards Jakhoo Ropeway then covering Hotel Doegar and up to Yodha Niwas which is the point of start."
  },
  {
    "Name": "Amit Dixhit",
    "WardNo": "6",
    "BlockNumber": "7",
    "North": "Satrting from the amar singh thakur niwas moving along the road upto bal krishan verma building covering thakur niwas 1 and thakur niwas 2",
    "East": "From bal krishan building walking upto vashisht niwas and then downwards upto pine view cottage covering kanwar niwas, bains niwas, addi niwas",
    "South": "from the pine view cottage walking upto kaliya niwas",
    "West": "from the kaliya niwas moving upwards upto amar singh thakur niwas"
  },
  {
    "Name": "Amit Dixhit",
    "WardNo": "5",
    "BlockNumber": "37",
    "North": "Starting from Gargi Girls Hostel Road moving towards HPU Girls hostel (up to)",
    "East": "From HPU Girls Hostel moving towards jungle area along virtual boundary upto Tribal hostel.",
    "South": "From tribal Hostel moving along up to road going to HPU(excluded).",
    "West": "From this point HPU(excluded) moving towards the Gargi Girls Hostel Road which is point of start"
  }
];

export const SAMPLE_BLOCK_LISTINGS: BlockListingItem[] = [
  {
    "structure": "Surya Kiran",
    "owner": "Er. A K Kashyap",
    "households": "2",
    "landmark": "NA",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Darla Bhavan",
    "owner": "KN Sharma",
    "households": "1",
    "landmark": "NA",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Pawan Padam Bhavan",
    "owner": "Sunita Parmar",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Shashi Bhavan",
    "owner": "Shravan Kumar Sharma",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Visual Bhavan",
    "owner": "J S Rana",
    "households": "4",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Gaytri Bhavan",
    "owner": "S R Sharma",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Nirmal Niwas/Dutta Niwas-Servant Quarters",
    "owner": "Usha Dutta",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Dutta Niwas",
    "owner": "Usha Dutta/ Shankar Lal",
    "households": "2",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "18 Nirmal Niwas",
    "owner": "Anil Dutta",
    "households": "2",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "18-19 Dutta Niwas",
    "owner": "G C Negi",
    "households": "0",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Sushila Duggal Niwas/Nirmal Niwas",
    "owner": "Arun Sehgal",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "20 Nirmal Niwas",
    "owner": "IP Singh",
    "households": "0",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Kulsishta Building",
    "owner": "Mr. Kulsishta",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Saxena Niwas",
    "owner": "Rajeev Saxena",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Trinetra House",
    "owner": "Vikaramaditya Singh",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Jeet Ram Niwas",
    "owner": "Jeet Ram",
    "households": "4",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Vikramaditya Extension",
    "owner": "Vikramaditya",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "21 Prospect Cottage",
    "owner": "Vimla Bharadwaj",
    "households": "2",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Anganwadi",
    "owner": "Bharadwaj",
    "households": "0",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Dhara",
    "owner": "PK Constructions",
    "households": "0",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Under Construction",
    "owner": "P K Construction",
    "households": "0",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Royal Oak Extension Apartment",
    "owner": "Surender Dhawan",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Under construction continued",
    "owner": "PK Construction",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Narvada House",
    "owner": "JR Verma",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Maheshwar Niwas",
    "owner": "Ramesh Chand",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Dutaa Niwas",
    "owner": "Anil Dutta",
    "households": "4",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Chouhan Cottage",
    "owner": "0",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Goal Market shops",
    "owner": "0",
    "households": "0",
    "landmark": "Others:- Shops",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "BSN High School",
    "owner": "Naresh Sharma",
    "households": "0",
    "landmark": "School",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Sharma Niwas",
    "owner": "Naresh Sharma",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Geeta Bhavan",
    "owner": "Shakuntala Devi",
    "households": "1",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Saraswati Niwas",
    "owner": "Roshan Lal Kondal",
    "households": "4",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Shakuntala Niwas",
    "owner": "Shakuntala",
    "households": "3",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  },
  {
    "structure": "Thakur Niwas",
    "owner": "Sohan Lal Thakur",
    "households": "4",
    "landmark": "0",
    "ivUnit": "2",
    "wardNo": "8",
    "blockNo": "33"
  }
];
