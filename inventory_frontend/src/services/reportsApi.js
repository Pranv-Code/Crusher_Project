import api from "./api";

// Party drilldown report (fetches from backend)
export const getPartyReport = (partyId) =>
    api.get(`/reports/party/${partyId}`);
