import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingTimeSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeSeconds, setRecordingTimeSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef('audio/webm');

  useEffect(() => {
    if (!isRecording) {
      setRecordingTimeSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setRecordingTimeSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error('Gravação de áudio indisponível neste ambiente.');
      }

      if (!window.isSecureContext) {
        throw new Error('Para usar o microfone, abra o sistema em HTTPS.');
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso ao microfone.');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Seu navegador não suporta gravação de áudio. Atualize o navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mimeTypeRef.current = mediaRecorder.mimeType || 'audio/webm';

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecordingTimeSeconds(0);
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          const permissionsApi = navigator.permissions as
            | {
                query: (permissionDesc: { name: 'microphone' }) => Promise<{ state: string }>;
              }
            | undefined;

          try {
            if (permissionsApi?.query) {
              const permission = await permissionsApi.query({ name: 'microphone' });

              if (permission.state === 'prompt') {
                throw new Error('Permissão de microfone ainda não aceita. Toque em gravar novamente e selecione Permitir.');
              }

              if (permission.state === 'denied') {
                throw new Error('Permissão de microfone negada. Ative o microfone nas configurações do navegador.');
              }
            }
          } catch (permissionError) {
            if (permissionError instanceof Error) {
              throw permissionError;
            }
          }

          throw new Error('Permissão de microfone não concedida. Toque em gravar novamente e permita o acesso.');
        }

        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error('Nenhum microfone foi encontrado no dispositivo.');
        }

        if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error('Não foi possível usar o microfone. Feche outros apps que estejam usando áudio.');
        }

        if (error.name === 'NotSupportedError') {
          throw new Error('Formato de gravação não suportado neste dispositivo.');
        }

        if (error.name === 'SecurityError') {
          throw new Error('Bloqueio de segurança ao acessar microfone. Verifique HTTPS e permissões.');
        }
      }

      throw new Error('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeTypeRef.current || audioChunksRef.current[0]?.type || 'audio/webm',
        });
        audioChunksRef.current = [];

        // Stop all tracks to release the microphone
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

        setIsRecording(false);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  return {
    isRecording,
    recordingTimeSeconds,
    startRecording,
    stopRecording,
  };
}
