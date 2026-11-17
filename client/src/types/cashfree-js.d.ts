// @cashfreepayments/cashfree-js ships no type definitions; this covers the parts the app uses.
declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string
    /** '_modal' opens the payment page over the current page; '_self' / '_blank' navigate. */
    redirectTarget?: '_modal' | '_self' | '_blank' | '_top' | HTMLElement
  }

  export interface CashfreeCheckoutResult {
    error?: { message?: string; code?: string }
    redirect?: boolean
    paymentDetails?: { paymentMessage?: string }
  }

  export interface Cashfree {
    checkout(options: CashfreeCheckoutOptions): Promise<CashfreeCheckoutResult>
  }

  /** Resolves to null outside a browser. */
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<Cashfree | null>
}
