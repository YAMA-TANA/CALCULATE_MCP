# CALCULATE_MCP

Deterministic calculation tools for LLMs via the Model Context Protocol (MCP).

Instead of asking a language model to do arithmetic in hidden reasoning, CALCULATE_MCP gives it explicit deterministic tools for arithmetic, high-precision decimals, units, statistics, finance, matrices, complex numbers, numerical calculus, probability distributions, date math, and root solving.

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
| `solve_root` | Bracketed numerical root solving with bisection |
| `calculate_matrix` | Add/subtract/multiply/transpose/determinant/inverse/solve Ax=b |
| `calculate_complex` | Complex add/subtract/multiply/divide/abs/arg/conjugate/pow/sqrt |
| `calculate_calculus` | Numerical derivative and definite integral |
| `calculate_probability` | Normal PDF/CDF, binomial PMF/CDF, Poisson PMF/CDF |
| `calculate_date` | ISO date add/difference/weekday/business-day calculations |

## Why another calculator MCP?

The point is not to replace a pocket calculator. The point is to give an LLM a deterministic numerical execution layer that it can call whenever a response depends on exact arithmetic or repeatable numerical methods.

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

Result: `0.3`.

## Advanced examples

Matrix solve:

```json
{
  "operation": "solve",
  "a": [[2, 1], [1, -1]],
  "b": [5, 1]
}
```

Numerical derivative:

```json
{
  "operation": "derivative",
  "expression": "x^3",
  "x": 2
}
```

Normal CDF:

```json
{
  "distribution": "normal",
  "operation": "cdf",
  "params": { "x": 1.96, "mean": 0, "sd": 1 }
}
```

Date math uses `YYYY-MM-DD` and UTC calendar semantics. `business_days` counts Monday-Friday and does **not** remove public holidays.

## Run over HTTP

Requires Node.js 22+.

```bash
npm install
npm run build
npm start
```

MCP endpoint: `http://localhost:3000/mcp`  
Health check: `GET /health`

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `ALLOWED_HOSTS` | unset | Comma-separated public hostnames for Host validation |

For public deployment, set `ALLOWED_HOSTS`, for example:

```bash
ALLOWED_HOSTS=calculate.example.com npm start
```

## Run over stdio

```bash
npm install
npm run build
npm run start:stdio
```

Example local MCP client configuration:

```json
{
  "mcpServers": {
    "calculate": {
      "command": "node",
      "args": ["/absolute/path/to/CALCULATE_MCP/dist/src/stdio.js"]
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

Call `list_units` for the machine-readable list. Categories include length, mass, time, area, volume, speed, data size, and temperature.

## Numerical-method notes

- Matrix inverse/solve use Gaussian elimination with partial pivoting.
- Derivatives use a five-point central difference.
- Definite integrals use Simpson's rule.
- Root solving uses bisection and requires a sign-changing bracket.
- Probability functions are deterministic numerical implementations; they are not intended as a replacement for specialized high-precision statistical libraries in extreme-tail scientific work.

## Development

```bash
npm install
npm run check
npm test
npm run build
```

## License

MIT
