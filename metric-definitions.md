# Metric Definitions — v0.1

- Net Sales: eligible sales after the agreed discount and return rules.
- COGS: eligible sold quantity multiplied by the applicable historical unit cost.
- Gross Profit: Net Sales minus COGS.
- Gross Margin %: Gross Profit / Net Sales * 100, only when Net Sales > 0.
- Absolute Change: Current Period Value - Comparison Period Value.
- Relative Change %: Absolute Change / Comparison Period Value * 100, only when the comparison value is non-zero.

Before implementation, agree on timezone, date boundaries, tax treatment, returns, cancellations, and missing costs. Never silently infer missing historical costs.
