/** Minimal typings for Google Identity Services (gsi) — One Tap / FedCM */
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            /** Legacy; prefer `params.nonce` (Chrome 145+). */
            nonce?: string;
            /** FedCM / Chrome 145+: pass nonce here. */
            params?: { nonce?: string };
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            itp_support?: boolean;
            /** @deprecated Ignored by GIS; browser controls FedCM for One Tap. */
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (
            momentNotification?: (n: {
              isNotDisplayed?: () => boolean;
              getNotDisplayedReason?: () => string;
              isSkippedMoment?: () => boolean;
              getSkippedReason?: () => string;
              isDismissedMoment?: () => boolean;
            }) => void,
          ) => void;
          cancel: () => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number | string;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}
