/**
 * Web stub for @stripe/stripe-react-native.
 * The native Stripe SDK imports React Native internals that are incompatible
 * with web builds. metro.config.js aliases this file on platform === 'web'.
 */
import React from 'react';

export const StripeProvider: React.FC<{
  publishableKey: string;
  merchantIdentifier?: string;
  children: React.ReactNode;
}> = ({ children }) => React.createElement(React.Fragment, null, children);

export function useStripe() {
  return {
    initPaymentSheet: async (_params: unknown) => ({ error: { message: 'Stripe is not available on web.' } }),
    presentPaymentSheet: async () => ({ error: { message: 'Stripe is not available on web.' } }),
  };
}
