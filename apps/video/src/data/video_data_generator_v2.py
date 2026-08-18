#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
from __future__ import annotations

import json
import random
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
from collections import defaultdict

from faker import Faker

fake = Faker()

CONFIG = {
    "USERS_COUNT": 40,
    "EXTRA_CHANNELS_COUNT": 0,
    "VIDEOS_COUNT": 100,
    "CATEGORIES_COUNT": 10,
    "TAGS_COUNT": 25,
    "TOTAL_PLAYLISTS": 100,
    "PLAYLISTS_PER_USER_MIN": 2,
    "PLAYLISTS_PER_USER_MAX": 4,
    "VIDEOS_PER_PLAYLIST_MIN": 3,
    "VIDEOS_PER_PLAYLIST_MAX": 15,
    "COMMENTS_PER_VIDEO_MIN": 2,
    "COMMENTS_PER_VIDEO_MAX": 7,
    "LIKES_PER_VIDEO_MIN": 5,
    "LIKES_PER_VIDEO_MAX": 5,
    "SUBSCRIPTIONS_PER_USER_MIN": 2,
    "SUBSCRIPTIONS_PER_USER_MAX": 10,
    "HISTORY_PER_USER_MIN": 5,
    "HISTORY_PER_USER_MAX": 15,
    "VIDEO_REPORTS_COUNT": 5,
    "COMMENT_REPORTS_COUNT": 5,
}

CATEGORY_NAMES = [
    ("Music", "Official music videos, covers, and instrumentals."),
    ("Gaming", "Gameplays, walkthroughs, reviews, and live streams."),
    ("Education", "Tutorials, how-tos, and lectures."),
    ("Entertainment", "Comedy, skits, and viral content."),
    ("News", "Current events and political commentary."),
    ("Technology", "Product reviews and coding tutorials."),
    ("Lifestyle", "Vlogs, productivity, and routines."),
    ("Sports", "Highlights and analysis."),
    ("Food & Drink", "Cooking tutorials and food reviews."),
    ("Health & Fitness", "Workout routines and wellness tips."),
]


def rand_ts(start_days_ago: int = 60, end_days_ago: int = 0) -> str:
    start = datetime.now() - timedelta(days=start_days_ago)
    end = datetime.now() - timedelta(days=end_days_ago)
    return fake.date_time_between(start_date=start, end_date=end).strftime("%Y-%m-%d %H:%M:%S")


@dataclass
class User:
    id: int
    email: str
    username: str
    password: str
    avatar: str
    bio: str
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None


@dataclass
class Channel:
    id: int
    user_id: int
    name: str
    description: str
    banner: str
    avatar: str
    subscriber_count: int
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None


@dataclass
class VideoCategory:
    id: int
    name: str
    description: str


@dataclass
class VideoTag:
    id: int
    tag: str


@dataclass
class Video:
    id: int
    channel_id: int
    category_id: int
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    duration: int
    visibility: str
    status: str
    view_count: int
    like_count: int
    comment_count: int
    is_comments_enabled: bool
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None


@dataclass
class Playlist:
    id: int
    user_id: int
    name: str
    description: str
    is_public: bool
    share_url: str
    shuffle: bool
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None


@dataclass
class PlaylistVideo:
    playlist_id: int
    video_id: int
    position: int
    added_at: str


@dataclass
class Comment:
    id: int
    video_id: int
    user_id: int
    parent_id: Optional[int]
    content: str
    is_edited: bool
    status: str
    reply_count: int
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None


@dataclass
class Like:
    user_id: int
    video_id: int
    created_at: str


@dataclass
class Subscription:
    user_id: int
    channel_id: int
    created_at: str


@dataclass
class History:
    user_id: int
    video_id: int
    watched_at: str


@dataclass
class VideoReport:
    video_id: int
    reporter_id: int
    reason: str
    created_at: str


@dataclass
class CommentReport:
    comment_id: int
    reporter_id: int
    reason: str
    created_at: str


class VideoDataGeneratorV2:
    def __init__(self, output_dir: str = "video_mock_data_v2") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

        self.users: List[User] = []
        self.channels: List[Channel] = []
        self.categories: List[VideoCategory] = []
        self.tags: List[VideoTag] = []
        self.videos: List[Video] = []
        self.playlists: List[Playlist] = []
        self.playlist_videos: List[PlaylistVideo] = []
        self.comments: List[Comment] = []
        self.likes: List[Like] = []
        self.subscriptions: List[Subscription] = []
        self.history: List[History] = []
        self.video_reports: List[VideoReport] = []
        self.comment_reports: List[CommentReport] = []

    def generate_all(self) -> None:
        self._generate_users()
        self._generate_categories_and_tags()
        self._generate_channels()
        self._generate_videos_and_tags()
        self._generate_playlists()
        self._generate_comments()
        self._generate_likes()
        self._generate_subscriptions()
        self._generate_history()
        self._generate_reports()
        self._save_all()
        self._log_summary()
        print(f"✔ Mock data generated in {self.output_dir}/")

    def _weighted_distribution(self, total, users, min_per_user, weight_split=0.7):
        base = [min_per_user] * users
        remaining = total - (min_per_user * users)

        weights = [weight_split if i < users // 2 else (1 - weight_split) for i in range(users)]
        weight_sum = sum(weights)
        norm_weights = [w / weight_sum for w in weights]

        for _ in range(remaining):
            picked = random.choices(range(users), weights=norm_weights, k=1)[0]
            base[picked] += 1

        return base   

    def _generate_users(self) -> None:
        for i in range(1, CONFIG["USERS_COUNT"] + 1):
            ts = rand_ts()
            self.users.append(User(
                id=i,
                email=fake.unique.email(),
                username=fake.unique.user_name(),
                password="password123",
                avatar=f"https://example.com/avatars/{i}.jpg",
                bio=fake.sentence(),
                created_at=ts,
                updated_at=ts,
            ))

    def _generate_categories_and_tags(self) -> None:
        self.categories = [
            VideoCategory(id=i + 1, name=name, description=desc)
            for i, (name, desc) in enumerate(CATEGORY_NAMES[:CONFIG["CATEGORIES_COUNT"]])
        ]
        self.tags = [VideoTag(i, fake.unique.word()) for i in range(1, CONFIG["TAGS_COUNT"] + 1)]

    def _generate_channels(self) -> None:
        for user in self.users:
            self.channels.append(Channel(
                id=user.id,
                user_id=user.id,
                name=f"{user.username} Channel",
                description=fake.text(100),
                banner=f"https://example.com/banners/{user.id}.jpg",
                avatar=user.avatar,
                subscriber_count=random.randint(1500, 25000),
                created_at=user.created_at,
                updated_at=user.updated_at,
            ))

    def _generate_videos_and_tags(self) -> None:
        tag_ids = [t.id for t in self.tags]
        video_id = 1
        user_video_counts = self._weighted_distribution(CONFIG["VIDEOS_COUNT"], len(self.channels), 2)

        for idx, (channel, num_videos) in enumerate(zip(self.channels, user_video_counts)):
            for _ in range(num_videos):
                ts = rand_ts()
                video = Video(
                    id=video_id,
                    channel_id=channel.id,
                    category_id=random.choice(self.categories).id,
                    title=fake.catch_phrase(),
                    description=fake.text(150),
                    video_url=f"https://example.com/videos/{video_id}.mp4",
                    thumbnail_url=f"https://example.com/videos/{video_id}/main.jpg",
                    duration=random.randint(60, 3600),
                    visibility=random.choices(["public", "private", "unlisted"], [0.9, 0.05, 0.05])[0],
                    status="active",
                    view_count=random.randint(0, 10000),
                    like_count=0,
                    comment_count=0,
                    is_comments_enabled=random.random() < 0.9,
                    created_at=ts,
                    updated_at=ts,
                )
                self.videos.append(video)
                video_id += 1

    
    def _generate_playlists(self) -> None:
        pid = 1
        user_playlist_counts = self._weighted_distribution(CONFIG["TOTAL_PLAYLISTS"], len(self.users), 2)

        for user, num_playlists in zip(self.users, user_playlist_counts):
            for _ in range(num_playlists):
                ts = rand_ts()
                playlist = Playlist(
                    id=pid,
                    user_id=user.id,
                    name=fake.sentence(nb_words=3),
                    description=fake.text(60),
                    is_public=True,
                    shuffle=bool(random.getrandbits(1)),
                    share_url=f"https://example.com/playlists/{pid}",
                    created_at=ts,
                    updated_at=ts,
                )
                self.playlists.append(playlist)

                vids = random.sample(self.videos, random.randint(CONFIG["VIDEOS_PER_PLAYLIST_MIN"], CONFIG["VIDEOS_PER_PLAYLIST_MAX"]))
                for pos, v in enumerate(vids, start=1):
                    self.playlist_videos.append(PlaylistVideo(pid, v.id, pos, rand_ts()))
                pid += 1


    def _generate_comments(self) -> None:
        cid = 1
        for video in self.videos:
            top_ids = []
            for _ in range(random.randint(CONFIG["COMMENTS_PER_VIDEO_MIN"], CONFIG["COMMENTS_PER_VIDEO_MAX"])):
                user = random.choice(self.users)
                ts = rand_ts()
                self.comments.append(Comment(
                    id=cid,
                    video_id=video.id,
                    user_id=user.id,
                    parent_id=None,
                    content=fake.sentence(),
                    is_edited=random.random() < 0.1,
                    status="visible",
                    reply_count=0,
                    created_at=ts,
                    updated_at=ts,
                ))
                top_ids.append(cid)
                cid += 1
            for parent_id in top_ids:
                if random.random() < 0.6:
                    for _ in range(random.randint(0, 2)):
                        user = random.choice(self.users)
                        ts = rand_ts()
                        self.comments.append(Comment(
                            id=cid,
                            video_id=video.id,
                            user_id=user.id,
                            parent_id=parent_id,
                            content=fake.sentence(),
                            is_edited=random.random() < 0.05,
                            status="visible",
                            reply_count=0,
                            created_at=ts,
                            updated_at=ts,
                        ))
                        cid += 1

        parent_map = {c.id: c for c in self.comments}
        for c in self.comments:
            if c.parent_id and c.parent_id in parent_map:
                parent_map[c.parent_id].reply_count += 1

        comment_counts = defaultdict(int)
        for c in self.comments:
            comment_counts[c.video_id] += 1
        for v in self.videos:
            v.comment_count = comment_counts[v.id]

    def _generate_likes(self) -> None:
        seen = set()
        user_ids = [u.id for u in self.users]
        for video in self.videos:
            like_count = random.randint(CONFIG["LIKES_PER_VIDEO_MIN"], CONFIG["LIKES_PER_VIDEO_MAX"])
            for uid in random.sample(user_ids, min(like_count, len(user_ids))):
                if (uid, video.id) not in seen:
                    self.likes.append(Like(uid, video.id, rand_ts()))
                    seen.add((uid, video.id))
                    video.like_count += 1

    def _generate_subscriptions(self) -> None:
        seen = set()
        for user in self.users:
            channel_ids = [c.id for c in self.channels if c.user_id != user.id]
            sample_size = random.randint(CONFIG["SUBSCRIPTIONS_PER_USER_MIN"], CONFIG["SUBSCRIPTIONS_PER_USER_MAX"])
            for cid in random.sample(channel_ids, min(sample_size, len(channel_ids))):
                if (user.id, cid) not in seen:
                    self.subscriptions.append(Subscription(user.id, cid, rand_ts()))
                    seen.add((user.id, cid))

    def _generate_history(self) -> None:
        for user in self.users:
            sample_size = random.randint(CONFIG["HISTORY_PER_USER_MIN"], CONFIG["HISTORY_PER_USER_MAX"])
            for vid in random.sample(self.videos, sample_size):
                self.history.append(History(user.id, vid.id, rand_ts()))

    def _generate_reports(self) -> None:
        for _ in range(CONFIG["VIDEO_REPORTS_COUNT"]):
            v = random.choice(self.videos)
            u = random.choice(self.users)
            self.video_reports.append(VideoReport(v.id, u.id, fake.sentence(), rand_ts()))
        for _ in range(CONFIG["COMMENT_REPORTS_COUNT"]):
            c = random.choice(self.comments)
            u = random.choice(self.users)
            self.comment_reports.append(CommentReport(c.id, u.id, fake.sentence(), rand_ts()))

    def _write_json(self, filename: str, obj: object) -> None:
        with (self.output_dir / filename).open("w") as f:
            json.dump(obj, f, indent=2)

    def _save_all(self) -> None:
        users_out = []
        for u in self.users:
            data = asdict(u)
            data["subscriptions"] = [asdict(s) for s in self.subscriptions if s.user_id == u.id]
            data["history"] = [asdict(h) for h in self.history if h.user_id == u.id]
            users_out.append(data)
        self._write_json("users.json", users_out)
        self._write_json("channels.json", [asdict(c) for c in self.channels])
        self._write_json("categories_tags.json", {
            "categories": [asdict(c) for c in self.categories],
            "tags": [asdict(t) for t in self.tags]
        })

        videos_out = []
        for v in self.videos:
            data = asdict(v)
            data["likes"] = [asdict(l) for l in self.likes if l.video_id == v.id]
            data["reports"] = [asdict(r) for r in self.video_reports if r.video_id == v.id]
            data["tag_map"] = [{"video_id": v.id, "tag_id": tid} for tid in getattr(v, "_tag_ids", [])]
            videos_out.append(data)
        self._write_json("videos.json", videos_out)

        playlists_out = []
        for pl in self.playlists:
            data = asdict(pl)
            data["videos"] = [asdict(pv) for pv in self.playlist_videos if pv.playlist_id == pl.id]
            playlists_out.append(data)
        self._write_json("playlists.json", playlists_out)

        top_comments = [c for c in self.comments if c.parent_id is None]
        comments_out = []
        for c in top_comments:
            data = asdict(c)
            data["replies"] = [asdict(rep) for rep in self.comments if rep.parent_id == c.id]
            data["reports"] = [asdict(cr) for cr in self.comment_reports if cr.comment_id == c.id]
            comments_out.append(data)
        self._write_json("comments.json", comments_out)

    def _log_summary(self) -> None:
        print(f"USERS: {len(self.users)}")
        print(f"CHANNELS: {len(self.channels)}")
        print(f"VIDEOS: {len(self.videos)}")
        print(f"PLAYLISTS: {len(self.playlists)}")
        print(f"COMMENTS: {len(self.comments)}")
        print(f"LIKES: {len(self.likes)}")
        print(f"SUBSCRIPTIONS: {len(self.subscriptions)}")
        print(f"HISTORY: {len(self.history)}")
        print(f"VIDEO REPORTS: {len(self.video_reports)}")
        print(f"COMMENT REPORTS: {len(self.comment_reports)}")


def main() -> None:
    generator = VideoDataGeneratorV2()
    generator.generate_all()


if __name__ == "__main__":
    main()
