# SailRock

A dive planner for the iPhone home screen, built on the dive tables I learned to plan with:
the Bühlmann/Hahn ascent table and the PADI Recreational Dive Planner (RDP) for air, EANx32
and EANx36.

I designed SailRock and worked out how it should behave: what a diver enters, which rules the
planner applies and what it shows back. The implementation was done by
[Claude Code](https://claude.com/claude-code).

> **Not a substitute for training, a dive computer or the printed tables.** The tables in this
> app were transcribed from scans. Check every plan against the original table before you dive
> it.

## What it does

- **RDP planner** (no-decompression dives): pressure group after each dive, surface-interval
  credit, residual nitrogen time, the adjusted no-decompression limit, safety-stop rule, the
  cold-water rule (+4 m) and the WX/YZ rule for three or more dives a day. Air, EANx32 and
  EANx36.
- **Bühlmann/Hahn planner** (0–250 m above sea level, ascent at 10 m/min): decompression stops
  and repetitive group for a depth and bottom time, and repetitive dives using the
  surface-interval and time-penalty tables. Always reads the next greater depth and the next
  longer time; never interpolates.
- **Nitrox calculator**: maximum operating depth at 1.4 and 1.6 ata, oxygen partial pressure,
  equivalent air depth and best mix.
- **Gas planning** for every dive: consumption from your SAC rate and cylinder, pressure left
  at the surface, and minimum gas for an emergency ascent of two divers on one cylinder.
- **Saved plans**, kept on the device.
- Works offline once installed (PWA) and remembers the last plan on the device.

The interface is in Polish and English: it follows the browser's language and switches in the header.

## Where the numbers come from

The tables were transcribed from the scans published on [nurkomania.pl](https://nurkomania.pl/nurkowanie-tabele-dekompresyjne.html):

| Table | Checked against |
| --- | --- |
| Bühlmann/Hahn 0–250 m | the four worked examples on the site |
| RDP air, tables 1–3 | five worked problems on the site |
| RDP surface-interval table | read independently from three cards; all 351 ranges agree |
| RDP EANx32 | table 3 read separately and compared with table 1 |
| RDP EANx36 | table 1 only; side 2 of the card was not available |

Known caveats:

- Residual nitrogen times for EANx36 are derived from table 1 because table 3 was not available.
- On the EANx32 scan, table 3 prints 24 for 30 m / group K where table 1 gives 21; the app uses 21.
- Tables for altitudes above 250 m are not included.
- The RDP is © DSAT/PADI; the tables are included here for personal study use.

The repository also contains a Bühlmann ZH-L16C gradient-factor engine (`src/engine`). It is
tested but not used by the interface; the planners follow the printed tables.

## Design system

The interface is built with my design system, [Big Hat](https://konstancja-tanjga.github.io/bighat-design-system/)
(`@bighat/ui`): its components, its semantic tokens and its rules (no primitive tokens, no
off-scale spacing, `StateBlock` for empty and error states, visible labels on every control).
The package is not on npm yet, so a built copy is vendored in `vendor/`.

## Run it

```bash
npm install
npm run dev      # local development
npm test         # table and engine tests
npm run build    # production build in dist/
```

Requires Node 22 or newer.

## Deployment

The app is a static Vite build, set up for Vercel through `vercel.json`:

- the build command runs the tests first, so a failing table test blocks the deploy;
- pushes to `main` deploy to production, pull requests get preview URLs;
- the service worker and manifest are served without caching so updates reach installed copies.

To install on an iPhone, open the deployed site in Safari and choose **Share → Add to Home Screen**.

## Project layout

```
src/tables/   transcribed tables and the table planners (with tests)
src/engine/   Bühlmann ZH-L16C gradient-factor engine (with tests)
src/ui/       screens built on @bighat/ui
vendor/       built copy of @bighat/ui
```
