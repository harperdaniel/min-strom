# Elvia And Elhub Dataspike

Status: not started

The dashboard should be decided after real data is inspected. Do not lock chart
behavior or provider details from memory.

## Questions To Answer

- How much history does Elvia return?
- What period sizes are accepted by `metervalues`?
- Does Elvia require a separate API subscription key in addition to a personal
  token?
- What are the documented and practical rate limits?
- Are values hourly, 15-minute, or mixed?
- How quickly are yesterday's values available?
- How often does `verified` change from false to true?
- What meter-point metadata is returned?
- How does `maxhours` relate to grid-tariff peak periods?

## Output

Store only anonymized examples:

- `docs/examples/elvia-metervalues.anonymized.json`
- `docs/examples/elvia-maxhours.anonymized.json`
- `docs/examples/elhub-export.anonymized.csv`

Never commit raw tokens, complete meter-point IDs, names, addresses, or real
timestamps that can identify a home.

