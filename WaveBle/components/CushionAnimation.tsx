import React, { useEffect, useState, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Static imports for all images
const images = {
  A1: require('../imgs/animation/A1.png'),
  A2: require('../imgs/animation/A2.png'),
  A3: require('../imgs/animation/A3.png'),
  A4: require('../imgs/animation/A4.png'),
  A5: require('../imgs/animation/A5.png'),
  B1: require('../imgs/animation/B1.png'),
  B2: require('../imgs/animation/B2.png'),
  B3: require('../imgs/animation/B3.png'),
  B4: require('../imgs/animation/B4.png'),
  B5: require('../imgs/animation/B5.png'),
  C1: require('../imgs/animation/C1.png'),
  C2: require('../imgs/animation/C2.png'),
  C3: require('../imgs/animation/C3.png'),
  C4: require('../imgs/animation/C4.png'),
  C5: require('../imgs/animation/C5.png'),
};

interface CushionAnimationProps {
  isPlaying: boolean;
  currentZone: 'A' | 'B' | 'C' | null;
  pumpStatus: 'Pump_ON' | 'Pump_OFF';
  pumpTime: number;
}

const CushionAnimation: React.FC<CushionAnimationProps> = ({
  isPlaying,
  currentZone,
  pumpStatus,
  pumpTime,
}) => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [zoneFrames, setZoneFrames] = useState<Record<'A' | 'B' | 'C', number>>({
    A: 1,
    B: 1,
    C: 1,
  });
  const animationTimer = useRef<NodeJS.Timeout | null>(null);
  const previousZoneRef = useRef<'A' | 'B' | 'C' | null>(null);

  const getImageSource = (zone: string, frame: number) => {
    const key = `${zone}${frame}` as keyof typeof images;
    return images[key];
  };

  useEffect(() => {
    // Reset everything when cycle stops
    if (!isPlaying) {
      setCurrentFrame(1);
      setZoneFrames({ A: 1, B: 1, C: 1 });
      previousZoneRef.current = null;
      if (animationTimer.current) {
        clearInterval(animationTimer.current);
      }
      return;
    }

    // Handle zone changes
    if (currentZone && currentZone !== previousZoneRef.current) {
      setCurrentFrame(1); // Start from first frame when zone changes
      previousZoneRef.current = currentZone;
    }

    // Handle animation when pump is on
    if (pumpStatus === 'Pump_ON' && currentZone) {
      const frameDuration = pumpTime / 5;
      
      if (animationTimer.current) {
        clearInterval(animationTimer.current);
      }

      animationTimer.current = setInterval(() => {
        setCurrentFrame(prevFrame => {
          const nextFrame = prevFrame >= 5 ? 5 : prevFrame + 1;
          // Update the frame for the current zone
          setZoneFrames(prev => ({
            ...prev,
            [currentZone]: nextFrame
          }));
          return nextFrame;
        });
      }, frameDuration);

      return () => {
        if (animationTimer.current) {
          clearInterval(animationTimer.current);
        }
      };
    } else if (pumpStatus === 'Pump_OFF' && currentZone) {
      // When pump stops, clear the timer but keep the current frame
      if (animationTimer.current) {
        clearInterval(animationTimer.current);
      }
    }
  }, [isPlaying, currentZone, pumpStatus, pumpTime]);

  const getCurrentImage = () => {
    if (!isPlaying) {
      return images.A1; // Default image
    }
    
    if (!currentZone) {
      return images.A1;
    }

    try {
      const imageSource = getImageSource(currentZone, currentFrame);
      console.log('Loading image:', currentZone, currentFrame, imageSource); // Debug log
      return imageSource;
    } catch (error) {
      console.error('Error loading image:', error);
      return images.A1; // Fallback to default image
    }
  };

  useEffect(() => {
    console.log('Testing image loading...');
    Object.entries(images).forEach(([key, source]) => {
      console.log(`Testing image ${key}:`, source);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={getCurrentImage()}
        style={styles.image}
        resizeMode="contain"
        onError={(error) => console.error('Image loading error:', error.nativeEvent.error)} // Add error handler
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default CushionAnimation; 