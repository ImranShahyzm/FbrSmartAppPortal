export const RECORD_RULE_OPERATORS = [
    { value: 'eq', label: '= (eq)' },
    { value: 'neq', label: '≠ (neq)' },
    { value: 'in', label: 'in' },
    { value: 'notin', label: 'not in' },
] as const;

export const RECORD_RULE_CONTEXT_REFS = [
    { value: 'currentUser.id', label: 'Current user id' },
    { value: 'currentUser.companyId', label: 'Current user company' },
    { value: 'currentUser.allowedCompanyIds', label: 'Allowed company ids (for in / not in)' },
] as const;
