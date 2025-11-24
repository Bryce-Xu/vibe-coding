// Provided by user
export const TFNSW_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJXTmFZVG1xNDlXUEdVQzBEYlVLcEpGRkNoY09mMk9pUzY5c0hfeTBOMW9FIiwiaWF0IjoxNzYzOTYyMDEyfQ.LdAIkdBLyjwTEECvBsEQ2VMgHcbc54BzDoymVUftAHY";

export const TFNSW_BASE_URL = "https://api.transport.nsw.gov.au/v1/carpark";

// Mock data to use if API fails (likely due to CORS in browser environment)
export const MOCK_CARPARKS = [
  {
    facility_id: "1",
    facility_name: "Tallawong Station Car Park",
    latitude: "-33.6896",
    longitude: "150.9068",
    tsn: "TWG",
    park_id: "P1",
    zones: [],
    occupancy: {
      loop: "1",
      total: 1000,
      occupied: 850,
      month: "Oct",
      time: "12:00"
    }
  },
  {
    facility_id: "2",
    facility_name: "Kellyville Station Car Park",
    latitude: "-33.7135",
    longitude: "150.9490",
    tsn: "KVE",
    park_id: "P2",
    zones: [],
    occupancy: {
      loop: "1",
      total: 1360,
      occupied: 200,
      month: "Oct",
      time: "12:05"
    }
  },
  {
    facility_id: "3",
    facility_name: "Bella Vista Station",
    latitude: "-33.7299",
    longitude: "150.9577",
    tsn: "BVA",
    park_id: "P3",
    zones: [],
    occupancy: {
      loop: "1",
      total: 800,
      occupied: 795,
      month: "Oct",
      time: "12:10"
    }
  },
  {
    facility_id: "4",
    facility_name: "Hills Showground Station",
    latitude: "-33.7275",
    longitude: "150.9856",
    tsn: "HSG",
    park_id: "P4",
    zones: [],
    occupancy: {
      loop: "1",
      total: 600,
      occupied: 300,
      month: "Oct",
      time: "12:15"
    }
  },
   {
    facility_id: "5",
    facility_name: "Gordon Station Car Park",
    latitude: "-33.7562",
    longitude: "151.1540",
    tsn: "GDN",
    park_id: "P5",
    zones: [],
    occupancy: {
      loop: "1",
      total: 200,
      occupied: 180,
      month: "Oct",
      time: "12:15"
    }
  }
];