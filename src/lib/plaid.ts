import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

const env = (process.env.PLAID_ENV ?? 'sandbox') as keyof typeof PlaidEnvironments

const configuration = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

// Transactions works across all institution types (banks, credit cards, brokerages)
// Investments and Liabilities are fetched after connection based on account type
export const PLAID_PRODUCTS: Products[] = [
  Products.Transactions,
]

export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us]
