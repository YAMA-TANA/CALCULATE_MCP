# CALCULATE_MCP

Deterministic calculation tools for LLMs via the Model Context Protocol (MCP).

Instead of asking a language model to do arithmetic in its hidden reasoning, CALCULATE_MCP gives it explicit tools for numeric work: expression evaluation, high-precision decimal arithmetic, unit conversion, descriptive statistics, percentages, finance, and numerical root solving.

Built for the **2026 MCP TypeScript SDK v2** and usable over both Streamable HTTP and stdio.

## Tools

| Tool | Purpose |
|---|---|
| `calculate_expression` | Safe arithmetic/scientific expression evaluation with variables |
| `calculate_decimal` | 1-200 digit decimal arithmetic using `decimal.js` |
| `convert_units` | Length, mass, time, area, volume, speed, data, temperature |
| `list_units` | Discover accepted unit symbols |
| `summarize_statistics` | Mean, median, variance, standard deviation, quartiles, IQR |
| `calculate_percentage` | Percent-of, percent ratio, increase/decrease, percentage change |
| `calculate_finance` | Compound FV/PV and periodic loan payments |
| `solve_root` | Robust bracketed numerical root solving with bisection |

## Why another calculator MCP?

The point is not to replace a pocket calculator. The point is to give an LLM a small, deterministic numerical execution layer that it can call whenever a response depends on exact arithmetic.

The expression evaluator does **not** use JavaScript `eval`. Expressions are parsed by a dedicated math parser with assignment, logical expressions, conditionals, concatenation, and membership operators disabled.

For decimal-sensitive work such as `0.1 + 0.2`, use `calculate_decimal`:

```json
{
  "operation": "add",
  "a": "0.1",
  "b": "0.2",
  "precision": 50
}
```

Result:

```json
{
  "result": "0.3"
}
```

## Run over HTTP

Requires Node.js 22+.

```bash
npm install
npm run build
npm start
```

The MCP endpoint is:

```text
http://localhost:3000/mcp
```

Health check:

```text
GET /health
```

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `ALLOWED_HOSTS` | unset | Comma-separated public hostnames for Host validation |

For a public deployment, set `ALLOWED_HOSTS` to the hostname(s) serving the MCP endpoint, for example:

```bash
ALLOWED_HOSTS=calculate.example.com npm start
```

## Run over stdio

```bash
npm install
npm run build
npm run start:stdio
```

Example local MCP client configuration after cloning this repository:

```json
{
  "mcpServers": {
    "calculate": {
      "command": "node",
      "args": ["/absolute/path/to/CALCULATE_MCP/dist/stdio.js"]
    }
  }
}
```

## Expression syntax

Examples:

```text
2 + 3 * 4
sqrt(2)^2
sin(pi / 2)
log10(1000)
a*b + c
x^3 - x - 2
```

Constants: `pi`, `e`, `tau`.

Functions include `abs`, `sqrt`, `sin`, `cos`, `tan`, inverse/hyperbolic trig, `ln`, `log10`, `log2`, `exp`, `min`, `max`, `hypot`, `floor`, `ceil`, `round`, `trunc`, and `sign`.

## Supported units

Call `list_units` for the machine-readable list. Current categories include:

- length: `m`, `km`, `cm`, `mm`, `um`, `nm`, `in`, `ft`, `yd`, `mi`, `nmi`
- mass: `kg`, `g`, `mg`, `ug`, `lb`, `oz`, `stone`, `tonne`
- time: `s`, `ms`, `min`, `h`, `day`, `week`
- area: `m2`, `km2`, `cm2`, `mm2`, `ha`, `acre`, `ft2`, `in2`
- volume: `L`, `mL`, `m3`, `cm3`, `tsp`, `tbsp`, `cup`, `floz`, `pint`, `quart`, `gallon`
- speed: `m/s`, `km/h`, `mph`, `knot`, `ft/s`
- data: `B`, `KB`, `MB`, `GB`, `TB`, `KiB`, `MiB`, `GiB`, `TiB`
- temperature: `C`, `F`, `K`

## Development

```bash
npm install
npm run check
npm test
npm run build
```

## License

MIT
