# Architecture

WarEra API → Provider → Sync Service → Supabase → Intelligence Modules → Discord Commands/Alerts.

The provider boundary keeps endpoint changes isolated. Historical snapshots allow resistance, battles, markets and activity to be analyzed over time.