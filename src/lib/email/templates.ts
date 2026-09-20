/**
 * Product email HTML templates for admin campaigns.
 * Links and unsubscribe placeholders are rewritten at send time with tracking tokens.
 */

export type ProductEmailTemplate = {
  id: string;
  label: string;
  subject: string;
  /** Plain-text fallback / preview in compose UI */
  text: string;
  html: string;
};

export const ESAT_FREE_MOCKS_V4_ID = "esat-free-mocks-v4";

const ESAT_FREE_MOCKS_V4_HTML = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>5 free written ESAT Mocks from us</title>
    <style>
      html, body { margin:0 !important; padding:0 !important; width:100% !important; }
      table, td { border-collapse:collapse !important; }
      img { border:0; display:block; line-height:100%; outline:none; text-decoration:none; }
      a { text-decoration:none; }
      @media screen and (max-width:640px) {
        .shell { width:100% !important; }
        .content { padding-left:22px !important; padding-right:22px !important; }
        .hero-title { font-size:30px !important; line-height:36px !important; }
      }
    </style>
  </head>
  <body style="background:#f4f4f2; margin:0; padding:0;">
    <div style="display:none; font-size:1px; color:#f4f4f2; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
      Five free written ESAT mocks, built around feedback from students who sat the ESAT in 2025.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f2; width:100%;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e7e7e3; border-radius:18px; overflow:hidden; width:600px; max-width:600px;">

            <tr>
              <td class="content" style="padding:30px 38px 22px 38px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="44" valign="middle"><img src="https://esatcamp.com/email/esat-camp-logo-email.png" width="36" height="36" alt="ESAT CAMP" style="height:36px; width:36px;"></td>
                    <td valign="middle" style="font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; letter-spacing:0.08em; color:#111111;">ESAT CAMP</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding:26px 38px 12px 38px;">
                <h1 class="hero-title" style="font-family:Arial, Helvetica, sans-serif; font-size:38px; line-height:44px; letter-spacing:-0.035em; color:#111111; margin:0 0 18px 0; font-weight:700;">5 free written ESAT Mocks from us</h1>

                <p style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:27px; color:#595954; margin:0 0 16px 0;">Good Evening,</p>

                <p style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:27px; color:#595954; margin:0 0 18px 0;">A fairly important update: our ESAT mocks are now live. You can find all 5 of them here, and they are all free.</p>

                <a href="https://esatcamp.com/esat-mock-tests" target="_blank" style="background:#111111; border-radius:10px; color:#ffffff; display:inline-block; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; line-height:20px; padding:15px 24px; text-decoration:none;">Try a mock →</a>

                <p style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:27px; color:#595954; margin:24px 0 16px 0;">We spent the past few weeks writing and rewriting questions using feedback from students who sat the ESAT in 2025. The message we got was that NSAA and ENGAA were useful, but the real ESAT was a lot harder, faster and more tiring.</p>

                <p style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:27px; color:#595954; margin:0 0 0 0;">One reason may be the way students tended to practise with 20-question sets from individual modules rather than a full paper, which did not prepare them well for the stamina the real test needed.</p>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding:36px 38px 0 38px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6e6e2;">
                  <tr>
                    <td style="padding:32px 0 0 0;">
                      <h2 style="font-family:Arial, Helvetica, sans-serif; font-size:24px; line-height:31px; letter-spacing:-0.02em; color:#111111; margin:0 0 12px 0;">What makes these mocks different</h2>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:27px; color:#4f4f4a; margin:0 0 14px 0;">There are 27 questions in 40 minutes. We tried to reproduce the format of the diagrams, tables and the style of the distractor options to help simulate the ESAT. We have also designed the distractors so you can practise educated guessing as much as possible.</p>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:27px; color:#4f4f4a; margin:0;">We think they are a closer rehearsal for the ESAT than doing another old paper.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding:28px 38px 0 38px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafaf8; border:1px solid #e8e8e4; border-radius:14px;">
                  <tr>
                    <td style="padding:22px 24px;">
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:18px; line-height:28px; color:#111111; margin:0 0 7px 0; font-weight:700;">5 mocks, 675 new questions, in all five subjects</p>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:25px; color:#686862; margin:0;">Maths 1, Maths 2, Physics, Chemistry and Biology.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding:38px 38px 0 38px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6e6e2;">
                  <tr>
                    <td style="padding:32px 0 0 0;">
                      <h2 style="font-family:Arial, Helvetica, sans-serif; font-size:24px; line-height:31px; letter-spacing:-0.02em; color:#111111; margin:0 0 12px 0;">An outage, unfortunately</h2>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:27px; color:#4f4f4a; margin:0 0 14px 0;">We received several reports of an ESAT Camp outage this afternoon.</p>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:27px; color:#4f4f4a; margin:0 0 14px 0;">The boring bookkeeping stuff is that usage grew a lot faster than part of our infrastructure did. So we spent the day upgrading capacity and changing how the site scales. We have fixed the cause of today's outage and increased capacity, so this specific issue should not happen again.</p>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:27px; color:#4f4f4a; margin:0;">The less boring explanation is that rather more of you are using ESAT Camp than we expected. So a huge thank you from the team. We really appreciate your questionnaires, survey responses and individual requests, and we will look through every ticket in the coming week.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding:38px 38px 0 38px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6e6e2;">
                  <tr>
                    <td style="padding:32px 0 0 0;">
                      <h2 style="font-family:Arial, Helvetica, sans-serif; font-size:24px; line-height:31px; letter-spacing:-0.02em; color:#111111; margin:0 0 12px 0;">One other thing</h2>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:27px; color:#4f4f4a; margin:0 0 14px 0;">We want to keep as much useful ESAT preparation free as we reasonably can.</p>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:27px; color:#4f4f4a; margin:0;">That is happening more slowly than we would like, mostly because someone still has to write the questions and pay for servers. But that is our goal with ESAT CAMP, so enjoy the mock papers and let us know what you think.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding:30px 38px 0 38px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafaf8; border:1px solid #e8e8e4; border-radius:12px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:25px; color:#4f4f4a; margin:0 0 8px 0;"><strong style="color:#111111;">If a question is bad, tell us.</strong></p>
                      <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#686862; margin:0;">We have spent weeks on these, which is exactly why we would love to hear what is wrong with them so we can fix things as quickly as possible. You can send feedback through the support page in your <a href="https://esatcamp.com/dashboard" target="_blank" style="color:#111111; font-weight:700; text-decoration:underline;">dashboard</a>.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="content" align="center" style="padding:32px 38px 40px 38px;">
                <a href="https://esatcamp.com/esat-mock-tests" target="_blank" style="background:#111111; border-radius:10px; color:#ffffff; display:inline-block; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; line-height:20px; padding:15px 24px; text-decoration:none;">Start a free mock →</a>
              </td>
            </tr>

            <tr>
              <td class="content" style="background:#fafaf8; border-top:1px solid #e8e8e4; padding:24px 38px 28px 38px;">
                <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:#85857e; margin:0; text-align:center;">ESAT CAMP · Independent ESAT preparation<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#666660; text-decoration:underline;">Unsubscribe</a></p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const ESAT_FREE_MOCKS_V4_TEXT = `5 free written ESAT Mocks from us

Good Evening,

A fairly important update: our ESAT mocks are now live. You can find all 5 of them here, and they are all free.

https://esatcamp.com/esat-mock-tests

We spent the past few weeks writing and rewriting questions using feedback from students who sat the ESAT in 2025. The message we got was that NSAA and ENGAA were useful, but the real ESAT was a lot harder, faster and more tiring.

One reason may be the way students tended to practise with 20-question sets from individual modules rather than a full paper, which did not prepare them well for the stamina the real test needed.

What makes these mocks different
There are 27 questions in 40 minutes. We tried to reproduce the format of the diagrams, tables and the style of the distractor options to help simulate the ESAT. We have also designed the distractors so you can practise educated guessing as much as possible.

We think they are a closer rehearsal for the ESAT than doing another old paper.

5 mocks, 675 new questions, in all five subjects
Maths 1, Maths 2, Physics, Chemistry and Biology.

An outage, unfortunately
We received several reports of an ESAT Camp outage this afternoon. We have fixed the cause and increased capacity.

One other thing
We want to keep as much useful ESAT preparation free as we reasonably can. Enjoy the mock papers and let us know what you think.

If a question is bad, tell us via your dashboard: https://esatcamp.com/dashboard

Start a free mock: https://esatcamp.com/esat-mock-tests
`;

export const PRODUCT_EMAIL_TEMPLATES: ProductEmailTemplate[] = [
  {
    id: ESAT_FREE_MOCKS_V4_ID,
    label: "5 free written ESAT Mocks (v4)",
    subject: "5 free written ESAT Mocks from us",
    text: ESAT_FREE_MOCKS_V4_TEXT,
    html: ESAT_FREE_MOCKS_V4_HTML,
  },
];

export function getProductEmailTemplate(
  id: string | null | undefined,
): ProductEmailTemplate | null {
  if (!id) return null;
  return PRODUCT_EMAIL_TEMPLATES.find((t) => t.id === id) ?? null;
}
