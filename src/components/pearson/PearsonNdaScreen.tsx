"use client";

/**
 * Screen 2: NDA / welcome (untimed, no question counter).
 */
export function PearsonNdaScreen() {
  return (
    <div className="pearson-static-content">
      <div className="pearson-nda-logo" aria-hidden="true">
        <span className="pearson-uat-pill pearson-uat-u">U</span>
        <span className="pearson-uat-pill pearson-uat-a">A</span>
        <span className="pearson-uat-pill pearson-uat-t">T</span>
        <span className="pearson-uat-wordmark">
          <strong>UAT</strong> UK
          <br />
          <span className="pearson-uat-sub">University Admissions Tests UK</span>
        </span>
      </div>

      <p>
        Welcome to the <strong>Engineering and Science Admissions Test (ESAT)</strong>.
      </p>
      <p>
        <strong>
          Non-disclosure agreement and general terms of use for tests developed for UAT-UK:
        </strong>
      </p>
      <p>
        The test content is confidential and must not be disclosed, reproduced, or transmitted
        in any form or by any means without the prior written permission of UAT-UK. By
        proceeding, you agree to these terms.
      </p>
      <p>
        Click the <strong>Next (N)</strong> button when you are ready to begin the test.
      </p>
    </div>
  );
}
