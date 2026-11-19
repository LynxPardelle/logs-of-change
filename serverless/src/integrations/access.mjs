export const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);

export function planIsPlus(plan, nowEpoch) {
  return plan?.active === true && plan.plan === 'plus' && (!Object.hasOwn(plan, 'expiresAt') || (Number.isSafeInteger(plan.expiresAt) && plan.expiresAt > nowEpoch));
}

export function plusCondition(nowEpoch) {
  return {
    ConditionExpression: '#active = :active AND #plan = :plus AND (attribute_not_exists(#expiresAt) OR #expiresAt > :now)',
    ExpressionAttributeNames: { '#active': 'active', '#plan': 'plan', '#expiresAt': 'expiresAt' },
    ExpressionAttributeValues: { ':active': true, ':plus': 'plus', ':now': nowEpoch },
  };
}
