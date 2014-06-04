#!/usr/bin/env python2.7

############################################################################
## Author: Nikolaus Mayer <mayern@informatik.uni-freiburg.de>             ##
##                                                                        ##
## Convert a single-channel 16-bit image (unsigned short) to a            ##
## four-channel 8-bit image.                                              ##
## Written as helper function to allow usage of Kinect data in            ##
## the LMBViewer application.                                             ##
##                                                                        ##
## Recombine values in the resulting image via (pixel[0] + pixel[1]*256). ##
############################################################################

import sys
import struct
from PIL import Image

def convert(images):
  for image in images:
    ## Load image
    with open(image) as f:
      d = f.read()
    img_info = d[:17].split()
    width  = int(img_info[1])
    height = int(img_info[2])
    ## Cut off meta data
    d = d[17:]

    ## Unpack bytes into unsigned 16bit values
    raw = struct.unpack('%dH'%(width*height), d)
    new_image = Image.new('RGBA', (width,height))
    for y in range(height):
      for x in range(width):
        index = y*width+x
        value = raw[index]
        ## [ SIXTEENBIT_VALUE ] 16-bit single-channel pixel becomes ...
        upperbyte = value/256
        lowerbyte = value-upperbyte*256
        ## ... [ SIXTEENB,IT_VALUE,0,255 ] 8-bit four-channel pixel
        new_image.putpixel((x,y), (upperbyte,lowerbyte,0,255))
    save_filename = image[:-4]+'_converted.png'
    new_image.save(save_filename, 'PNG')
  

if __name__=='__main__':
  if len(sys.argv) < 2:
    print "Usage:", sys.argv[0], "<list of images to convert>"
  convert(sys.argv[1:])

