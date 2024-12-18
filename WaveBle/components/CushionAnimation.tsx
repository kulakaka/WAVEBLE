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
  pumpPressureTime: number;
  pumpVacuumTime: number;
}

const CushionAnimation: React.FC<CushionAnimationProps> = ({
  isPlaying,
  currentZone,
  pumpStatus,
  pumpPressureTime,
  pumpVacuumTime,
}) => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const animationTimer = useRef<NodeJS.Timeout | null>(null);
  const previousZoneRef = useRef<'A' | 'B' | 'C' | null>(null);

  const getImageSource = (zone: string, frame: number) => {
    const key = `${zone}${frame}` as keyof typeof images;
    return images[key];
  };

  useEffect(() => {
    console.log('Animation State:', { isPlaying, currentZone, pumpStatus, currentFrame });

    const startAnimation = () => {
      const totalCycleTime = pumpPressureTime + pumpVacuumTime + 22000;
      const frameInterval = Math.floor(totalCycleTime / 4); // 4 transitions for 5 frames
      console.log('Animation timing:', { totalCycleTime, frameInterval });

      animationTimer.current = setInterval(() => {
        setCurrentFrame(prevFrame => {
          const nextFrame = prevFrame >= 5 ? 5 : prevFrame + 1;
          console.log('Frame transition:', { prevFrame, nextFrame });
          return nextFrame;
        });
      }, frameInterval);
    };

    const stopAnimation = () => {
      if (animationTimer.current) {
        clearInterval(animationTimer.current);
        animationTimer.current = null;
      }
    };

    // Reset animation when stopping or changing zones
    if (!isPlaying || !currentZone) {
      stopAnimation();
      setCurrentFrame(1);
      previousZoneRef.current = null;
      return;
    }

    // Handle zone changes
    if (currentZone !== previousZoneRef.current) {
      console.log('Zone changed:', { from: previousZoneRef.current, to: currentZone });
      stopAnimation();
      setCurrentFrame(1);
      previousZoneRef.current = currentZone;
    }

    // Start or stop animation based on pump status
    if (pumpStatus === 'Pump_ON') {
      stopAnimation(); // Clear any existing animation
      startAnimation();
    } else {
      stopAnimation();
      setCurrentFrame(5); // Set to final frame when pump is off
    }

    return () => {
      stopAnimation();
    };
  }, [isPlaying, currentZone, pumpStatus, pumpPressureTime, pumpVacuumTime]);

  const getCurrentImage = () => {
    if (!isPlaying || !currentZone) {
      return images.A1;
    }
    
    console.log('Getting image for:', { currentZone, currentFrame });
    return getImageSource(currentZone, currentFrame);
  };

  return (
    <View style={styles.container}>
      <Image
        source={getCurrentImage()}
        style={styles.image}
        resizeMode="contain"
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