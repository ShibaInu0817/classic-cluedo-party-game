/** One deadline per room. Re-arming replaces the previous deadline. */
export class TurnTimer {
  private handle?: ReturnType<typeof setTimeout>;
  deadline?: number;

  arm(ms: number, onExpire: () => void) {
    this.clear();
    this.deadline = Date.now() + ms;
    this.handle = setTimeout(() => {
      this.handle = undefined;
      onExpire();
    }, ms);
  }

  clear() {
    if (this.handle) clearTimeout(this.handle);
    this.handle = undefined;
    this.deadline = undefined;
  }
}
