# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for video scenario instance generation."""

import random as _random
from typing import Any, Dict, List

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import DataVolumeConstraint, EntityExistsConstraint


class VideoTitleBatch(BaseModel):
    titles: List[str]
    descriptions: List[str]


class CommentContentBatch(BaseModel):
    comments: List[str]


class ChannelNameBatch(BaseModel):
    names: List[str]


CATEGORY_ID_MAP = {
    "documentary": 3,
    "tutorial": 3,
    "entertainment": 4,
    "vlog": 7,
    "review": 6,
}

HISTORY_HAS_ENTRIES = DataVolumeConstraint(
    table="history", min_count=2, user_filter=True,
)

CHANNEL_EXISTS_FOR_USER = EntityExistsConstraint(
    table="channels", user_filter=True, min_count=1,
)

PLAYLISTS_EXIST_FOR_USER = DataVolumeConstraint(
    table="playlists", min_count=1, user_filter=True,
)

MULTIPLE_CHANNELS_EXIST = EntityExistsConstraint(
    table="channels", min_count=2,
)

FEED_NAME_TO_ID = {
    "recommended for me": "recommended-for-you",
    "similar to what I watched": "similar-watched",
    "in my orbit": "in-your-orbit",
    "in my zone": "in-your-zone",
    "popular in music": None,
    "popular in gaming": None,
}


def video_title_prompt(category: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic video titles and short descriptions "
        f"for {category} videos on a video platform. "
        f"Each title should be 3-10 words, catchy and specific. "
        f"Each description should be 1-2 sentences matching the title. "
        f"Ensure variety. Return JSON with keys 'titles' and 'descriptions' "
        f"as parallel arrays of strings."
    )


def video_record(
    title: str,
    description: str,
    category: str,
    rng: _random.Random,
    **overrides: Any,
) -> Dict[str, Any]:
    category_id = CATEGORY_ID_MAP.get(category, 4)
    record = {
        "id": "{{auto_id}}",
        "channelId": 1,
        "categoryId": category_id,
        "title": title,
        "description": description,
        "videoUrl": "/videos/test_video.mp4",
        "thumbnailUrl": "/thumbnails/test_thumb.jpg",
        "duration": rng.randint(300, 3600),
        "visibility": "public",
        "status": "active",
        "viewCount": rng.randint(100, 10000),
        "likeCount": rng.randint(5, 100),
        "commentCount": rng.randint(0, 50),
        "isCommentsEnabled": 1,
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


def comment_record(
    content: str,
    rng: _random.Random,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": 7777,
        "videoId": 9999,
        "userId": "{{current_user_id}}",
        "parentId": None,
        "content": content,
        "status": "visible",
        "isEdited": 0,
        "replyCount": 0,
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


def playlist_record(
    name: str,
    description: str,
    rng: _random.Random,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "name": name,
        "description": description,
        "isPublic": 0,
        "shuffle": 0,
        "shareUrl": None,
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


def playlist_video_record(
    playlist_id: int,
    video_id: int,
    position: int,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "playlistId": playlist_id,
        "videoId": video_id,
        "position": position,
        "addedAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record



def user_record(
    username: str,
    email: str,
    rng: _random.Random,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": 9998,
        "email": email,
        "username": username,
        "password": "password123",
        "avatar": "",
        "bio": "",
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{past_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record


def channel_record(
    name: str,
    rng: _random.Random,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": 9990,
        "userId": 9998,
        "name": name,
        "description": "",
        "banner": None,
        "avatar": None,
        "subscriberCount": rng.randint(100, 50000),
        "createdAt": "{{past_timestamp}}",
        "updatedAt": "{{past_timestamp}}",
        "deletedAt": None,
    }
    record.update(overrides)
    return record
