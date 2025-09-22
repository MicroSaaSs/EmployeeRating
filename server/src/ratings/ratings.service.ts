import { Injectable, Logger } from "@nestjs/common";

export type RatingRecord = {
  id: string;
  raterUserId: string;
  targetUserId: string;
  score: number;
  category?: string;
  comment?: string;
  createdAt: number;
};

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);
  private readonly ratings = new Map<string, RatingRecord>();

  constructor() {}

  listByRater(raterUserId: string): RatingRecord[] {
    return Array.from(this.ratings.values()).filter(
      (r) => r.raterUserId === raterUserId
    );
  }

  listByTarget(targetUserId: string): RatingRecord[] {
    return Array.from(this.ratings.values()).filter(
      (r) => r.targetUserId === targetUserId
    );
  }

  listByReceiver(receiverUserId: string): RatingRecord[] {
    return this.listByTarget(receiverUserId);
  }

  upsert(rating: RatingRecord) {
    this.ratings.set(rating.id, rating);
    this.logger.debug(
      `Saved rating ${rating.id} from ${rating.raterUserId} to ${rating.targetUserId}`
    );
    return rating;
  }

  getById(id: string): RatingRecord | null {
    return this.ratings.get(id) || null;
  }

  delete(id: string): boolean {
    return this.ratings.delete(id);
  }
}
