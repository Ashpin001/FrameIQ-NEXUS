"""Deterministic, local thumbnail compositor with safe text and adjustable presentation."""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageOps
import textwrap

def create_thumbnail(source, destination, title='', subtitle='', aspect='16:9', brightness=1.0, contrast=1.0, style='gradient'):
    dims = {'16:9':(1280,720),'1:1':(1080,1080),'9:16':(720,1280)}
    if aspect not in dims: raise ValueError('Unsupported aspect ratio')
    w,h=dims[aspect]
    image=Image.open(source).convert('RGB')
    image=ImageOps.fit(image,(w,h),method=Image.Resampling.LANCZOS)
    image=ImageEnhance.Brightness(image).enhance(max(.4,min(1.8,float(brightness))))
    image=ImageEnhance.Contrast(image).enhance(max(.4,min(1.8,float(contrast))))
    image=image.convert('RGBA')
    overlay=Image.new('RGBA',(w,h),(0,0,0,0)); draw=ImageDraw.Draw(overlay)
    if style=='gradient':
        for y in range(h//3,h):
            a=int(215*(y-h//3)/(h-h//3))
            draw.line([(0,y),(w,y)],fill=(7,10,22,a))
    elif style=='dark': draw.rectangle((0,int(h*.62),w,h),fill=(8,12,25,200))
    image=Image.alpha_composite(image,overlay)
    draw=ImageDraw.Draw(image)
    font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    import os
    if not os.path.exists(font_path): font_path='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    try: font=ImageFont.truetype(font_path,max(30,int(w*.048)))
    except OSError: font=ImageFont.load_default()
    try: small=ImageFont.truetype(font_path,max(18,int(w*.024)))
    except OSError: small=ImageFont.load_default()
    title=' '.join(str(title).split())[:130]
    subtitle=' '.join(str(subtitle).split())[:100]
    if title:
        lines=textwrap.wrap(title,width=max(12,int(w/48)))[:3]
        line_height=int(w*.062)
        y=h-55-len(lines)*line_height-(45 if subtitle else 0)
        for line in lines:
            draw.text((45,y),line,font=font,fill='white',stroke_width=2,stroke_fill='#080b16');y+=line_height
        if subtitle:draw.text((46,y+5),subtitle,font=small,fill='#c7c9ff')
    image.convert('RGB').save(destination,'JPEG',quality=94,optimize=True)
    return destination
