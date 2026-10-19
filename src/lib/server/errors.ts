export class GameError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}

export const Errors = {
  roomNotFound: () =>
    new GameError(404, "room_not_found", "We couldn't find that room. Double-check the code with your host."),
  roomExpired: () =>
    new GameError(410, "room_expired", "This room has expired. Start a fresh one, it only takes a second."),
  roomFull: (max: number) =>
    new GameError(409, "room_full", `This room is full (${max} players max). Ask the host to make some space.`),
  nicknameTaken: () =>
    new GameError(409, "nickname_taken", "Someone in this room already has that nickname. Try another one."),
  unauthorized: () =>
    new GameError(401, "not_in_room", "You're not part of this room yet. Join with a nickname first."),
  removed: () => new GameError(403, "removed", "You were removed from this room by the host."),
  hostOnly: () => new GameError(403, "host_only", "Only the host can do that."),
  badRequest: (message: string) => new GameError(400, "bad_request", message),
  conflict: (code: string, message: string) => new GameError(409, code, message),
  rateLimited: () =>
    new GameError(429, "rate_limited", "Whoa, slow down a little. Try again in a minute."),
};
