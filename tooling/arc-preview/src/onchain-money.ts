// Read-only decimal display helpers selected from Arc Studio onchain-money.ts.
function assertValidDecimals(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 36) throw Error("Invalid decimals");
}

function absBigInt(value: bigint): bigint {
  return value < 0n ? -value : value;
}

/** Drops trailing zeros without a regex — a fixed-width scan avoids any backtracking risk. */
function trimTrailingZeros(digits: string): string {
  let end = digits.length;

  while (end > 0 && digits[end - 1] === '0') {
    end -= 1;
  }

  return digits.slice(0, end);
}

export function formatUnitsExact(raw: bigint, decimals: number): string {
  assertValidDecimals(decimals);

  if (decimals === 0) {
    return raw.toString();
  }

  const sign = raw < 0n ? '-' : '';
  const digits = absBigInt(raw)
    .toString()
    .padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = trimTrailingZeros(digits.slice(digits.length - decimals));

  return fraction === '' ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
}

export function formatUnitsFixed(raw: bigint, decimals: number, fractionDigits: number): string {
  assertValidDecimals(decimals);
  assertValidDecimals(fractionDigits);

  const sign = raw < 0n ? '-' : '';
  const digits = absBigInt(raw)
    .toString()
    .padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals === 0 ? '' : digits.slice(digits.length - decimals);

  if (fractionDigits === 0) {
    return `${sign}${whole}`;
  }

  return `${sign}${whole}.${fraction.slice(0, fractionDigits).padEnd(fractionDigits, '0')}`;
}
