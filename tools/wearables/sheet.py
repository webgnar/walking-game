import sys,glob
from PIL import Image
files=sys.argv[2:]; w=240
cols=4; rows=(len(files)+cols-1)//cols
im=Image.new('RGB',(cols*w,rows*w),'white')
for i,f in enumerate(files):
    t=Image.open(f).convert('RGB').resize((w,w)); im.paste(t,((i%cols)*w,(i//cols)*w))
im.save(sys.argv[1])
