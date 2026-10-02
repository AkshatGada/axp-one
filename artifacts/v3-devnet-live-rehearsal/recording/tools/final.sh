set -e
T=$1; IL=16.3; XF=0.8
node assemble.mjs take$T/intro take$T/intro.mp4 auto $IL
[ -f take$T/present.mp4 ] || node assemble.mjs take$T/present take$T/present.mp4 auto 240
OFF=$(python3 -c "print(round($IL-$XF,3))"); TOT=$(python3 -c "print(round($IL+240-$XF,3))"); FO=$(python3 -c "print(round($IL+240-$XF-1.2,3))")
ffmpeg -v error -y -i take$T/intro.mp4 -i take$T/present.mp4 -filter_complex "[0:v]fade=t=in:st=0:d=0.4,settb=AVTB[a];[1:v]settb=AVTB[b];[a][b]xfade=transition=fade:duration=$XF:offset=$OFF,fade=t=out:st=$FO:d=1.2,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset slow -crf 18 -tune stillimage -r 60 -profile:v high -level 4.2 -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart -an take$T/axp-live-demo.mp4
echo "OFF=$OFF TOT=$TOT"
ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,pix_fmt,codec_name -of default=nw=1 take$T/axp-live-demo.mp4
