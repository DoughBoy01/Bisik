import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_phone", ["phoneNumber"]),

  contacts: defineTable({
    userId: v.id("users"),
    contactUserId: v.id("users"),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_contact", ["contactUserId"]),

  locations: defineTable({
    userId: v.id("users"),
    latitude: v.number(),
    longitude: v.number(),
    accuracy: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  sessions: defineTable({
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(), // 'active', 'completed'
  }).index("by_user", ["userId"]),
});
