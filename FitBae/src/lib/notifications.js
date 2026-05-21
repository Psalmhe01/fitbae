export const requestPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return "unsupported";
  }
  const permission = await Notification.requestPermission();
  return permission;
};

export const notifyRestComplete = () => {
  // 1. System Notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Rest Period Over!", {
      body: "Time to start your next set! Let's go.",
      icon: "/favicon.ico", // Path to your app icon
      silent: false,
    });
  }

  // 2. Audio Fallback (Crucial for mobile/inactive tabs)
  playNotificationSound();
};

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High A

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.5,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (err) {
    console.warn("Audio notification failed:", err);
  }
};
