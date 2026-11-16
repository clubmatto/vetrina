/**
 * Local versus cloud cost, for one model on one machine.
 *
 * The local side is a fixed hardware cost plus electricity. The cloud side is
 * a marginal price per token. The interesting output is the crossover, not the
 * monthly total.
 */

const DAYS_PER_MONTH = 30;
const SECONDS_PER_HOUR = 3600;

export interface CostInputs {
  hoursPerDay: number;
  tokensPerSecond: number;
  watts: number;
  electricityPrice: number;
  hardwareCost: number;
  hardwareYears: number;
  cloudPerMillion: number;
  includeHardware: boolean;
}

export interface CostEstimate {
  tokensPerMonth: number;
  electricityMonthly: number;
  hardwareMonthly: number;
  localMonthly: number;
  cloudMonthly: number;
  localPerMillion: number;
  cloudPerMillion: number;
  paybackMonths: number | null;
  crossoverHoursPerDay: number | null;
}

export function estimateCosts(input: CostInputs): CostEstimate | null {
  const {
    hoursPerDay,
    tokensPerSecond,
    watts,
    electricityPrice,
    hardwareCost,
    hardwareYears,
    cloudPerMillion,
    includeHardware,
  } = input;

  if (!(hoursPerDay > 0)) return null;
  if (!(tokensPerSecond > 0)) return null;
  if (!(watts >= 0)) return null;
  if (!(electricityPrice >= 0)) return null;
  if (!(cloudPerMillion > 0)) return null;
  if (includeHardware && !(hardwareCost >= 0 && hardwareYears > 0)) {
    return null;
  }

  const tokensPerMonth =
    tokensPerSecond * SECONDS_PER_HOUR * hoursPerDay * DAYS_PER_MONTH;

  const electricityPerHour = (watts / 1000) * electricityPrice;
  const electricityMonthly = electricityPerHour * hoursPerDay * DAYS_PER_MONTH;

  const hardwareMonthly = includeHardware
    ? hardwareCost / (hardwareYears * 12)
    : 0;

  const localMonthly = electricityMonthly + hardwareMonthly;
  const cloudMonthly = (tokensPerMonth / 1_000_000) * cloudPerMillion;
  const localPerMillion = localMonthly / (tokensPerMonth / 1_000_000);

  // Months to repay the hardware out of the monthly cloud bill.
  let paybackMonths: number | null = null;
  if (includeHardware && cloudMonthly > electricityMonthly) {
    paybackMonths = hardwareCost / (cloudMonthly - electricityMonthly);
  }

  // Usage level where the amortized local cost equals the cloud bill.
  let crossoverHoursPerDay: number | null = null;
  if (includeHardware) {
    const cloudPerHour =
      ((tokensPerSecond * SECONDS_PER_HOUR) / 1_000_000) * cloudPerMillion;
    const margin = cloudPerHour - electricityPerHour;
    if (margin > 0) {
      crossoverHoursPerDay = hardwareMonthly / DAYS_PER_MONTH / margin;
    }
  }

  return {
    tokensPerMonth,
    electricityMonthly,
    hardwareMonthly,
    localMonthly,
    cloudMonthly,
    localPerMillion,
    cloudPerMillion,
    paybackMonths,
    crossoverHoursPerDay,
  };
}
