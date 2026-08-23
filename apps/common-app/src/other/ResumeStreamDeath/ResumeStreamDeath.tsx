import React, { FC, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AudioContext, OscillatorNode } from 'react-native-audio-api';

import { Button, Container, Spacer } from '../../components';
import { colors } from '../../styles';

/**
 * Manual repro for https://github.com/software-mansion/react-native-audio-api/issues/1230
 *
 * 1. Tap Play — hear a sine tone (starts the Oboe stream).
 * 2. Tap Suspend — context goes suspended / idle.
 * 3. In a terminal: `adb shell killall audioserver`
 * 4. Tap Resume — on the wedging path this rejects with
 *    "Failed to resume audio context." and stays silent.
 *
 * Note: killall often recovers via ErrorDisconnected; last result may stay
 * "resume: ok". That means this run did not hit the permanent wedge.
 */
const ResumeStreamDeath: FC = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const [contextState, setContextState] = useState('—');
  const [lastResult, setLastResult] = useState('—');
  const [isPlaying, setIsPlaying] = useState(false);

  const refreshState = () => {
    const ctx = audioContextRef.current;
    setContextState(ctx?.state ?? 'no context');
  };

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    refreshState();

    return () => {
      oscillatorRef.current?.stop();
      oscillatorRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  const handlePlay = async () => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      return;
    }

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      oscillatorRef.current?.stop();
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      osc.type = 'sine';
      osc.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;

      setIsPlaying(true);
      setLastResult('play: ok');
    } catch (error) {
      console.error('[ResumeStreamDeath] play failed', error);
      setLastResult(`play failed: ${String(error)}`);
    }
    refreshState();
  };

  const handleSuspend = async () => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      return;
    }

    try {
      await ctx.suspend();
      setLastResult('suspend: ok');
    } catch (error) {
      console.error('[ResumeStreamDeath] suspend failed', error);
      setLastResult(`suspend failed: ${String(error)}`);
    }
    refreshState();
  };

  const handleResume = async () => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      return;
    }

    try {
      await ctx.resume();
      setLastResult('resume: ok');
    } catch (error) {
      console.error('[ResumeStreamDeath] resume failed', error);
      setLastResult(`resume failed: ${String(error)}`);
    }
    refreshState();
  };

  const handleStop = () => {
    oscillatorRef.current?.stop();
    oscillatorRef.current = null;
    setIsPlaying(false);
    setLastResult('oscillator stopped');
    refreshState();
  };

  return (
    <Container centered>
      <Text style={styles.title}>Resume after stream death</Text>
      <Text style={styles.hint}>
        Play → Suspend → adb shell killall audioserver → Resume
      </Text>
      <Spacer.Vertical size={24} />

      <View style={styles.row}>
        <Text style={styles.label}>context.state</Text>
        <Text style={styles.value}>{contextState}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>oscillator</Text>
        <Text style={styles.value}>{isPlaying ? 'playing' : 'stopped'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>last result</Text>
        <Text style={styles.value}>{lastResult}</Text>
      </View>

      <Spacer.Vertical size={32} />
      <Button title="Play tone" onPress={handlePlay} width={200} />
      <Spacer.Vertical size={12} />
      <Button title="Suspend" onPress={handleSuspend} width={200} />
      <Spacer.Vertical size={12} />
      <Button title="Resume" onPress={handleResume} width={200} />
      <Spacer.Vertical size={12} />
      <Button title="Stop oscillator" onPress={handleStop} width={200} />
      <Spacer.Vertical size={12} />
      <Button title="Refresh state" onPress={refreshState} width={200} />
    </Container>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    color: colors.white,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: colors.white,
    opacity: 0.7,
  },
  value: {
    color: colors.white,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
});

export default ResumeStreamDeath;
