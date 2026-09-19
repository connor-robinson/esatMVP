"use client";

/**
 * Screen 2: NDA / welcome (untimed, no question counter).
 * Official papers keep the UAT specimen wordmark; ESAT CAMP mocks use our brand
 * mark beside the mock sitting title.
 */

import { BrandMarkImage } from "@/components/brand/BrandMarkImage";

export type PearsonNdaScreenProps = {
  /** When set, show ESAT CAMP branding instead of the UAT specimen lockup. */
  campWelcomeTitle?: string | null;
};

export function PearsonNdaScreen({
  campWelcomeTitle = null,
}: PearsonNdaScreenProps) {
  const isCamp = Boolean(campWelcomeTitle);

  return (
    <div className="pearson-static-content">
      {isCamp ? (
        <div
          className="pearson-nda-logo pearson-nda-logo--camp"
          role="img"
          aria-label={campWelcomeTitle ?? "ESAT CAMP"}
        >
          <BrandMarkImage
            className="pearson-nda-camp-mark brightness-0"
            alt=""
          />
          <span className="pearson-nda-camp-wordmark">{campWelcomeTitle}</span>
        </div>
      ) : (
        <div className="pearson-nda-logo" aria-hidden="true">
          <span className="pearson-uat-pill pearson-uat-u">U</span>
          <span className="pearson-uat-pill pearson-uat-a">A</span>
          <span className="pearson-uat-pill pearson-uat-t">T</span>
          <span className="pearson-uat-wordmark">
            <span className="pearson-uat-wordmark-stack">
              University
              <br />
              Admissions
              <br />
              Tests
            </span>
            <span className="pearson-uat-uk">UK</span>
          </span>
        </div>
      )}

      <p>
        {isCamp ? (
          <>
            Welcome to <strong>{campWelcomeTitle}</strong>.
          </>
        ) : (
          <>
            Welcome to the{" "}
            <strong>Engineering and Science Admissions Test (ESAT)</strong>.
          </>
        )}
      </p>
      <p>
        <strong>
          {isCamp
            ? "Non-disclosure agreement and general terms of use for ESAT CAMP practice tests:"
            : "Non-disclosure agreement and general terms of use for tests developed for UAT-UK:"}
        </strong>
      </p>
      <p>
        {isCamp ? (
          <>
            The test content is confidential and must not be disclosed, reproduced,
            or transmitted in any form or by any means without the prior written
            permission of ESAT CAMP. By proceeding, you agree to these terms.
          </>
        ) : (
          <>
            The test content is confidential and must not be disclosed, reproduced,
            or transmitted in any form or by any means without the prior written
            permission of UAT-UK. By proceeding, you agree to these terms.
          </>
        )}
      </p>
      <p>
        Click the <strong>Next (N)</strong> button when you are ready to begin the
        test.
      </p>
    </div>
  );
}
