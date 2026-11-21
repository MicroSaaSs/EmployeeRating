# E-ProRate LinkedIn Import

**Deferred prototype:** The product requirement is import without installing an extension. This folder is retained for development reference and is not a required user setup step. See the LinkedIn access investigation in `E-ProRate_Launch_Plan.md`.

Load this folder as an unpacked extension in Chrome or Edge.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the project's `extension` folder.
4. Pin **E-ProRate LinkedIn Import** to the browser toolbar.
5. Open a LinkedIn member profile, scroll to **Experience**, and expand the entries you need. You can also open **Show all experiences**.
6. Click the extension, choose **Local development** or **Production**, then click **Import this LinkedIn profile**.
7. Review the imported profile in E-ProRate. Use **Check shared work dates** to compare the reviewed dates with your saved work history, then save your private draft.

The production option requires the browser import page to be deployed to the production client.

The extension captures company names, role titles, displayed date ranges, the profile name, and the profile URL from the page you invoke it on. It uses temporary active-tab access and an E-ProRate relay. Imported details stay in extension session storage for up to 15 minutes until the destination tab acknowledges receipt. E-ProRate holds the preview in that tab's session storage for up to 15 minutes, until it is saved. Signing in from the same tab preserves the preview and adds a review link on the dashboard.

The extension reads rendered Experience entries. LinkedIn layout changes, collapsed entries, and missing dates can require another capture or manual review.

Run the extension tests with `npm ci --prefix extension && npm test --prefix extension`.
