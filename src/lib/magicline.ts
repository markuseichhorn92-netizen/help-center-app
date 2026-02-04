// Magicline Open API Client
// Docs: https://developer.sportalliance.com/apis/magicline/openapi

const MAGICLINE_API_URL = process.env.MAGICLINE_API_URL || 'https://fit-inn-trier.open-api.magicline.com/v1';
const MAGICLINE_API_KEY = process.env.MAGICLINE_API_KEY;

interface MagiclineCustomer {
  id: number;
  customerNumber: string;
  firstName: string;
  lastName: string;
  secondFirstName?: string | null;
  secondLastName?: string | null;
  dateOfBirth?: string;
  email?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  street?: string | null;
  houseNumber?: string | null;
  zipCode?: string | null;
  city?: string | null;
  country?: string | null;
  phonePrivate?: string | null;
  phonePrivateMobile?: string | null;
  phoneBusiness?: string | null;
  phoneBusinessMobile?: string | null;
  status?: 'MEMBER' | 'FORMER_MEMBER' | 'PROSPECT' | 'LEAD';
  cardNumbers?: string[];
  bankAccount?: {
    accountHolder?: string;
    bankName?: string;
    bic?: string;
    iban?: string;
  };
  accessRefusal?: boolean;
  uuid?: string;
  referralCode?: string;
  studioId?: number;
  createdDateTime?: string;
  idlePeriods?: Array<{
    id: number;
    startDate: string;
    endDate: string;
    reason: string;
    contract?: { id: number; rateName: string };
    unlimited: boolean;
  }>;
}

interface MagiclineContract {
  id: number;
  rateName: string;
  startDate: string;
  endDate?: string | null;
  createdDate?: string;
  cancellationDate?: string | null;
  cancellationReceiptDate?: string | null;
  cancellationReason?: string | null;
  contractStatus?: string;
  cancelled?: boolean;
  price?: number;
  priceDetails?: {
    basePrice?: { amount: number; currency: string };
    currentPrice?: { amount: number; currency: string };
  };
  // Legacy fields for compatibility
  status?: string;
  monthlyFee?: number;
  currency?: string;
}

interface MagiclineCheckin {
  id: number;
  checkinTime: string;
  checkoutTime?: string | null;
  studioId: number;
}

interface ApiResponse<T> {
  result: T[];
  hasNext: boolean;
  offset?: string;
  lastOffsetId?: number;
}

class MagiclineClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    if (!MAGICLINE_API_KEY) {
      console.warn('[Magicline] API key not configured');
    }
    this.apiUrl = MAGICLINE_API_URL;
    this.apiKey = MAGICLINE_API_KEY || '';
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Magicline API key not configured');
    }

    const url = `${this.apiUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Magicline] API error ${response.status}: ${errorText}`);
      throw new Error(`Magicline API error: ${response.status}`);
    }

    return response.json();
  }

  // Search customers by various criteria
  async searchCustomers(query: {
    email?: string;
    memberNumber?: string;
    name?: string;
    phone?: string;
    size?: number;
    offset?: string;
  }): Promise<ApiResponse<MagiclineCustomer>> {
    const params = new URLSearchParams();
    
    if (query.email) params.append('email', query.email);
    if (query.memberNumber) params.append('memberNumber', query.memberNumber);
    if (query.size) params.append('size', query.size.toString());
    if (query.offset) params.append('offset', query.offset);

    const result = await this.fetch<ApiResponse<MagiclineCustomer>>(
      `/customers?${params.toString()}`
    );

    // If searching by name, we need to filter client-side (API doesn't support name search)
    if (query.name && result.result) {
      const nameLower = query.name.toLowerCase();
      result.result = result.result.filter(c => 
        c.firstName?.toLowerCase().includes(nameLower) ||
        c.lastName?.toLowerCase().includes(nameLower) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(nameLower)
      );
    }

    // Filter by phone if provided
    if (query.phone && result.result) {
      const phoneClean = query.phone.replace(/\D/g, '');
      result.result = result.result.filter(c => 
        c.phonePrivate?.replace(/\D/g, '').includes(phoneClean) ||
        c.phonePrivateMobile?.replace(/\D/g, '').includes(phoneClean) ||
        c.phoneBusiness?.replace(/\D/g, '').includes(phoneClean) ||
        c.phoneBusinessMobile?.replace(/\D/g, '').includes(phoneClean)
      );
    }

    return result;
  }

  // Search customers by name across ALL pages (paginated search)
  async searchCustomersByName(name: string, maxResults: number = 20): Promise<MagiclineCustomer[]> {
    const nameLower = name.toLowerCase();
    const matches: MagiclineCustomer[] = [];
    let offset: string | undefined;
    let pageCount = 0;
    const maxPages = 50; // Safety limit

    while (pageCount < maxPages && matches.length < maxResults) {
      const params = new URLSearchParams();
      params.append('size', '100');
      if (offset) params.append('offset', offset);

      const result = await this.fetch<ApiResponse<MagiclineCustomer>>(
        `/customers?${params.toString()}`
      );

      // Filter for matching names
      const pageMatches = (result.result || []).filter(c => 
        c.firstName?.toLowerCase().includes(nameLower) ||
        c.lastName?.toLowerCase().includes(nameLower) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(nameLower)
      );

      matches.push(...pageMatches);

      // Check if there are more pages
      if (!result.hasNext || !result.offset) {
        break;
      }

      offset = result.offset;
      pageCount++;
    }

    return matches.slice(0, maxResults);
  }

  // Search customers by email across ALL pages (paginated search)
  // Magicline API doesn't support email query param, so we paginate and filter
  async searchCustomersByEmail(email: string, maxResults: number = 10): Promise<MagiclineCustomer[]> {
    const emailLower = email.toLowerCase();
    const matches: MagiclineCustomer[] = [];
    let offset: string | undefined;
    let pageCount = 0;
    const maxPages = 50; // Safety limit

    while (pageCount < maxPages && matches.length < maxResults) {
      const params = new URLSearchParams();
      params.append('size', '100');
      if (offset) params.append('offset', offset);

      const result = await this.fetch<ApiResponse<MagiclineCustomer>>(
        `/customers?${params.toString()}`
      );

      // Filter for matching email
      const pageMatches = (result.result || []).filter(c => 
        c.email?.toLowerCase().includes(emailLower)
      );

      matches.push(...pageMatches);

      // Check if there are more pages
      if (!result.hasNext || !result.offset) {
        break;
      }

      offset = result.offset;
      pageCount++;
    }

    return matches.slice(0, maxResults);
  }

  // Search customers by phone across ALL pages (paginated search)
  // Magicline API doesn't support phone query param, so we paginate and filter
  async searchCustomersByPhone(phone: string, maxResults: number = 10): Promise<MagiclineCustomer[]> {
    const phoneClean = phone.replace(/\D/g, '');
    const matches: MagiclineCustomer[] = [];
    let offset: string | undefined;
    let pageCount = 0;
    const maxPages = 50; // Safety limit

    while (pageCount < maxPages && matches.length < maxResults) {
      const params = new URLSearchParams();
      params.append('size', '100');
      if (offset) params.append('offset', offset);

      const result = await this.fetch<ApiResponse<MagiclineCustomer>>(
        `/customers?${params.toString()}`
      );

      // Filter for matching phone
      const pageMatches = (result.result || []).filter(c => 
        c.phonePrivate?.replace(/\D/g, '').includes(phoneClean) ||
        c.phonePrivateMobile?.replace(/\D/g, '').includes(phoneClean) ||
        c.phoneBusiness?.replace(/\D/g, '').includes(phoneClean) ||
        c.phoneBusinessMobile?.replace(/\D/g, '').includes(phoneClean)
      );

      matches.push(...pageMatches);

      // Check if there are more pages
      if (!result.hasNext || !result.offset) {
        break;
      }

      offset = result.offset;
      pageCount++;
    }

    return matches.slice(0, maxResults);
  }

  // Get customer by ID
  async getCustomer(id: number): Promise<MagiclineCustomer> {
    return this.fetch<MagiclineCustomer>(`/customers/${id}`);
  }

  // Get customer by member number
  async getCustomerByMemberNumber(memberNumber: string): Promise<MagiclineCustomer | null> {
    const result = await this.fetch<ApiResponse<MagiclineCustomer>>(
      `/customers?memberNumber=${encodeURIComponent(memberNumber)}&size=1`
    );
    return result.result?.[0] || null;
  }

  // Get customer contracts
  // Note: This endpoint returns an array directly, not wrapped in { result: [...] }
  async getCustomerContracts(customerId: number): Promise<MagiclineContract[]> {
    const result = await this.fetch<MagiclineContract[]>(
      `/customers/${customerId}/contracts`
    );
    return result || [];
  }

  // Get customer checkins
  async getCustomerCheckins(customerId: number, options?: {
    from?: string;
    to?: string;
    size?: number;
  }): Promise<MagiclineCheckin[]> {
    const params = new URLSearchParams();
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.size) params.append('size', options.size.toString());

    const result = await this.fetch<ApiResponse<MagiclineCheckin>>(
      `/customers/${customerId}/checkins?${params.toString()}`
    );
    return result.result || [];
  }

  // Get all customers (paginated)
  async getAllCustomers(options?: {
    size?: number;
    offset?: string;
    status?: string;
  }): Promise<ApiResponse<MagiclineCustomer>> {
    const params = new URLSearchParams();
    params.append('size', (options?.size || 50).toString());
    if (options?.offset) params.append('offset', options.offset);
    if (options?.status) params.append('status', options.status);

    return this.fetch<ApiResponse<MagiclineCustomer>>(`/customers?${params.toString()}`);
  }

  // Find customer by email (exact match)
  async findCustomerByEmail(email: string): Promise<MagiclineCustomer | null> {
    // API doesn't support exact email search, so we fetch and filter
    const result = await this.searchCustomers({ email, size: 100 });
    const emailLower = email.toLowerCase();
    return result.result?.find(c => c.email?.toLowerCase() === emailLower) || null;
  }

  // Find customer by phone number
  async findCustomerByPhone(phone: string): Promise<MagiclineCustomer | null> {
    const result = await this.searchCustomers({ phone, size: 100 });
    return result.result?.[0] || null;
  }
}

// Export singleton instance
export const magicline = new MagiclineClient();

// Export types
export type { MagiclineCustomer, MagiclineContract, MagiclineCheckin, ApiResponse };
