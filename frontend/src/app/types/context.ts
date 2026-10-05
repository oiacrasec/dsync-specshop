export interface AvailableOrganization {
    public_id: string;
    name: string;
}

export type UserContextsResponse = AvailableOrganization[];

export interface ActiveUserContext {
    organization_public_id: string;
    organization_name: string;
}
