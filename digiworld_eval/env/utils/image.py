# Copyright (c) Meta Platforms, Inc. and affiliates.
import math
import os

from PIL import Image, ImageDraw, ImageFont


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    if max_width <= 0:
        return [text]
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current_line: list[str] = []
    temp_img = Image.new("RGB", (1, 1))
    temp_draw = ImageDraw.Draw(temp_img)
    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = temp_draw.textbbox((0, 0), test_line, font=font)
        line_width = bbox[2] - bbox[0]
        if line_width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
                current_line = [word]
            else:
                lines.append(word)
    if current_line:
        lines.append(" ".join(current_line))
    return lines if lines else [""]


def _draw_circle(
    draw: ImageDraw.Draw, xy: tuple[int, int], size: int = 10, width: int = 5
):
    draw.ellipse(
        [xy[0] - size, xy[1] - size, xy[0] + size, xy[1] + size],
        outline=(0, 255, 0),
        width=width,
    )
    return draw


def _draw_arrow(
    draw: ImageDraw.Draw, x0: int, y0: int, x1: int, y1: int, width: int = 5
):
    start = (x0, y0)
    end = (x1, y1)
    draw.line([start, end], fill=(0, 255, 0), width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    arrow_head_length = 50
    arrow_angle = math.pi * 5 / 6
    arrow_end1 = (
        end[0] + arrow_head_length * math.cos(angle + arrow_angle),
        end[1] + arrow_head_length * math.sin(angle + arrow_angle),
    )
    arrow_end2 = (
        end[0] + arrow_head_length * math.cos(angle - arrow_angle),
        end[1] + arrow_head_length * math.sin(angle - arrow_angle),
    )
    draw.line([end, arrow_end1], fill=(0, 255, 0), width=width)
    draw.line([end, arrow_end2], fill=(0, 255, 0), width=width)
    return draw


def concat_trajectory_images(
    saved_screenshot_folder: str,
    rank_idx: int,
    thread_idx: int,
    unique_id: str,
    total_steps: int,
    title: str,
    images_per_row: int = 10,
    scale_factor: float = 0.30,
) -> Image.Image:
    images: list[Image.Image] = []
    for step in range(total_steps):
        img_path = f"{saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_traj_{unique_id}_step_{step}_with_action.png"
        if os.path.exists(img_path):
            img = Image.open(img_path)
            images.append(img)
        else:
            img_path_no_action = f"{saved_screenshot_folder}/rank_{rank_idx}_thread_{thread_idx}_traj_{unique_id}_step_{step}.png"
            if os.path.exists(img_path_no_action):
                img = Image.open(img_path_no_action)
                images.append(img)

    if not images:
        raise ValueError(f"No images found for trajectory {unique_id}")

    orig_width, orig_height = images[0].size
    scaled_width = int(orig_width * scale_factor)
    scaled_height = int(orig_height * scale_factor)

    num_images = len(images)
    num_rows = math.ceil(num_images / images_per_row)
    concat_width = images_per_row * scaled_width
    concat_height = num_rows * scaled_height

    font_size = max(int(scaled_height * 0.04), 24)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size
        )
    except OSError:
        font = ImageFont.load_default()

    title_padding = int(font_size * 0.5)
    rect_padding = int(font_size * 0.3)
    max_text_width = concat_width - 2 * (title_padding + rect_padding)
    wrapped_lines = _wrap_text(title, font, max_text_width)

    temp_img = Image.new("RGB", (1, 1))
    temp_draw = ImageDraw.Draw(temp_img)
    line_height = temp_draw.textbbox((0, 0), "Ay", font=font)[3]
    line_spacing = int(line_height * 0.2)
    total_text_height = (
        len(wrapped_lines) * line_height + (len(wrapped_lines) - 1) * line_spacing
    )
    title_area_height = total_text_height + 2 * title_padding

    final_image = Image.new(
        "RGB", (concat_width, concat_height + title_area_height), color=(255, 255, 255)
    )

    max_line_width = 0
    for line in wrapped_lines:
        bbox = temp_draw.textbbox((0, 0), line, font=font)
        max_line_width = max(max_line_width, bbox[2] - bbox[0])

    draw = ImageDraw.Draw(final_image)
    text_x_start = (concat_width - max_line_width) // 2
    text_y_start = title_padding

    rect_coords = [
        text_x_start - rect_padding,
        text_y_start - rect_padding,
        text_x_start + max_line_width + rect_padding,
        text_y_start + total_text_height + rect_padding,
    ]
    draw.rectangle(rect_coords, fill=(50, 50, 50))

    current_y = text_y_start
    for line in wrapped_lines:
        bbox = temp_draw.textbbox((0, 0), line, font=font)
        line_width = bbox[2] - bbox[0]
        text_x = (concat_width - line_width) // 2
        draw.text((text_x, current_y), line, fill=(255, 255, 255), font=font)
        current_y += line_height + line_spacing

    for idx, img in enumerate(images):
        row = idx // images_per_row
        col = idx % images_per_row
        x_offset = col * scaled_width
        y_offset = row * scaled_height + title_area_height
        resized_img = img.resize(
            (scaled_width, scaled_height), Image.Resampling.LANCZOS
        )
        final_image.paste(resized_img, (x_offset, y_offset))

    return final_image


def draw_action_image_only(img: Image.Image, action: dict) -> Image.Image:
    if not action:
        return img

    width, height = img.size
    draw = ImageDraw.Draw(img)
    if action["type"] == "tap":
        x, y = action["params"]["x"], action["params"]["y"]
        tap_circle_size = max(int(width * 0.02), 1)
        tap_circle_line_width = max(int(width * 0.01), 3)
        _draw_circle(draw, (x, y), size=tap_circle_size, width=tap_circle_line_width)
    elif action["type"] == "swipe":
        x0, y0 = action["params"]["x0"], action["params"]["y0"]
        x1, y1 = action["params"]["x1"], action["params"]["y1"]
        arraw_line_width = max(int(width * 0.005), 3)
        _draw_arrow(draw, x0, y0, x1, y1, width=arraw_line_width)

    action_str = f"{action['type']}"
    if "params" in action:
        action_str += f"({action['params']})"

    font_size = max(int(height * 0.03), 20)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size
        )
    except OSError:
        font = ImageFont.load_default()

    temp_draw = ImageDraw.Draw(img)
    bbox = temp_draw.textbbox((0, 0), action_str, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    padding = int(font_size * 0.5)
    text_area_height = text_height + 2 * padding
    new_height = height + text_area_height
    new_img = Image.new("RGB", (width, new_height), color=(0, 0, 0))
    new_img.paste(img, (0, 0))

    new_draw = ImageDraw.Draw(new_img)
    text_x = (width - text_width) // 2
    text_y = height + padding
    new_draw.text((text_x, text_y), action_str, fill=(255, 255, 255), font=font)

    return new_img
