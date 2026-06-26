import type { Platform, SelectedView } from './types';

export interface GuideSection {
  title: string;
  steps: string[];
}

export function getGuideContent(platform: Platform, selected: SelectedView): GuideSection {
  if (selected.type === 'welcome' || selected.type === 'new_campaign') {
    return {
      title: 'Getting started',
      steps: [
        'Click "+ New Campaign" in the sidebar to start a blank campaign with all fields visible right away.',
        'Or open the "Import from Briefing Sheet" section once you\'re in a campaign — paste a Google Sheet URL or upload an Excel/CSV briefing to bulk-create campaigns instead of filling fields by hand.',
        'Switching the Google/Facebook tab at the top always takes you straight to a campaign form — no extra clicks needed.',
      ],
    };
  }

  if (selected.type === 'campaign' || selected.type === 'adgroup') {
    return platform === 'google'
      ? {
          title: 'Google campaign — what each field does',
          steps: [
            'Channel, Main goal, Performance goal, Month, Market and dates all feed directly into the auto-generated Campaign and Ad Group names shown at the top — fill these in first.',
            'Product category, family and promoted are free text — use your own product naming, they just feed into the auto-generated names.',
            'Market picks a default Country Group and Countries automatically — adjust the country pills below if the briefing wants a different mix.',
            'Location targeting level controls whether the country list applies to the whole campaign or just this ad group in the exported CSV. Default (Ad group level) matches how the original tool always worked — Campaign level is newer and worth double-checking after a real import into Google Ads Editor.',
            'Networks and Languages are picked from fixed Editor-supported options. Use "+ Add languages for selected countries" to quickly match languages to your chosen countries.',
            'Labels auto-generates from Month + Year if left blank — only type something here to override that.',
            'Once everything looks right, click "Next: Add ad" at the bottom to move to ad creation.',
          ],
        }
      : {
          title: 'Facebook campaign — what each field does',
          steps: [
            'Campaign Name and Ad Set Name are free text here (Facebook campaigns don\'t auto-generate names the way Google ones do).',
            'Campaign Objective, Optimization Goal and Billing Event should generally line up with each other — e.g. an Awareness objective usually pairs with Impressions/Reach optimization.',
            'Budget can be set at Daily or Lifetime, at either the campaign level or the ad set level (or both, if you want to constrain at both levels).',
            'Countries, Gender and Age range define who sees the ads. Publisher/Device platforms and Facebook/Instagram positions control where the ad can show.',
            'Once everything looks right, click "Next: Add ad" at the bottom to move to ad creation.',
          ],
        };
  }

  if (selected.type === 'ad' || selected.type === 'new_ad') {
    return platform === 'google'
      ? {
          title: 'Google ad — what each field does',
          steps: [
            'Paste a YouTube URL into "YouTube URL or Video ID" — it auto-extracts the video ID and fetches the real video title for you.',
            'Click "✨ Generate with AI" after the title is filled to auto-write 5 headlines, 5 long headlines and 5 descriptions sized to fit Google\'s limits.',
            'Headlines max out at 30 characters, Long headlines at 90, Descriptions at 90 — the counters under each box turn red if you go over.',
            'At least one Long Headline is required before this ad will pass validation and export cleanly.',
            'Final URL is the destination link people land on after clicking the ad — make sure it\'s filled in even if you used AI-generated copy.',
          ],
        }
      : {
          title: 'Facebook ad — what each field does',
          steps: [
            'Image File Name must exactly match a file already uploaded to Ads Manager\'s media library — this tool can\'t upload images itself, only reference them by name.',
            'Title caps at 25 characters, Body (primary text) caps at 500 — both are required fields along with the Destination URL.',
            'Link Description and Display Link are optional but show up in the ad preview if filled in.',
            'Call to Action picks the button shown on the ad (e.g. "Shop Now", "Learn More").',
          ],
        };
  }

  return { title: 'Guide', steps: [] };
}
