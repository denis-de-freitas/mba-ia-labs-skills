export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvariantViolation extends DomainError {
  constructor(reason: string) {
    super(`invariant violated: ${reason}`, 'INVARIANT_VIOLATION');
  }
}
