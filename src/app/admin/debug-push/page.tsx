"use client";

import { useState, useEffect } from "react";

export default function DebugPushPage() {
  const [info, setInfo] = useState<Record<string, string | boolean | null>>({});
  const [testResult, setTestResult] = useState<string>("");

  useEffect(() => {
    const checkAll = async () => {
      const data: Record<string, string | boolean | null> = {};

      // User Agent
      data["User Agent"] = navigator.userAgent;

      // iOS Detection
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      data["iOS Gerät"] = isIOS;

      // iOS Version
      if (isIOS) {
        const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
          data["iOS Version"] = `${match[1]}.${match[2]}`;
          const majorVersion = parseInt(match[1]);
          const minorVersion = parseInt(match[2]);
          data["iOS 16.4+ (erforderlich)"] = majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
        }
      }

      // Standalone Mode (PWA installed)
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
        || (window.navigator as any).standalone === true;
      data["Standalone Mode (PWA installiert)"] = isStandalone;

      // Service Worker Support
      data["Service Worker unterstützt"] = "serviceWorker" in navigator;

      // Push Manager Support
      data["Push Manager unterstützt"] = "PushManager" in window;

      // Notification Support
      data["Notifications unterstützt"] = "Notification" in window;

      // Notification Permission
      if ("Notification" in window) {
        data["Notification Berechtigung"] = Notification.permission;
      }

      // Service Worker Registration
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          data["Service Worker registriert"] = !!registration;
          if (registration) {
            data["SW Scope"] = registration.scope;
            data["SW Active"] = !!registration.active;
          }
        } catch (e: any) {
          data["SW Fehler"] = e.message;
        }
      }

      // Push Subscription
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          data["Push Subscription aktiv"] = !!subscription;
          if (subscription) {
            data["Push Endpoint"] = subscription.endpoint.substring(0, 60) + "...";
          }
        } catch (e: any) {
          data["Push Fehler"] = e.message;
        }
      }

      setInfo(data);
    };

    checkAll();
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setTestResult(`Berechtigung: ${result}`);
      // Refresh info
      window.location.reload();
    } catch (e: any) {
      setTestResult(`Fehler: ${e.message}`);
    }
  };

  const testLocalNotification = async () => {
    try {
      if (Notification.permission !== "granted") {
        setTestResult("Berechtigung nicht erteilt");
        return;
      }

      // Try direct notification first
      const notification = new Notification("Test Lokal", {
        body: "Diese Notification wurde lokal erstellt",
        icon: "/favicon.png",
      });

      notification.onclick = () => {
        setTestResult("Notification wurde angeklickt!");
      };

      setTestResult("Lokale Notification gesendet!");
    } catch (e: any) {
      setTestResult(`Fehler: ${e.message}`);
    }
  };

  const testServiceWorkerNotification = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("Test SW", {
        body: "Diese Notification wurde vom Service Worker erstellt",
        icon: "/favicon.png",
        tag: "test-sw",
      });
      setTestResult("SW Notification gesendet!");
    } catch (e: any) {
      setTestResult(`Fehler: ${e.message}`);
    }
  };

  const testServerPush = async () => {
    try {
      setTestResult("Sende Push vom Server...");
      const res = await fetch("/api/admin/push/test", { method: "POST" });
      const data = await res.json();
      setTestResult(`Server: ${JSON.stringify(data, null, 2)}`);
    } catch (e: any) {
      setTestResult(`Fehler: ${e.message}`);
    }
  };

  const subscribe = async () => {
    try {
      setTestResult("Subscribing...");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setTestResult(`Berechtigung abgelehnt: ${permission}`);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Get VAPID key
      const keyRes = await fetch("/api/admin/push/vapid-key");
      const { publicKey } = await keyRes.json();

      // Convert key
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send to server
      await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setTestResult("Subscription erfolgreich!\n" + JSON.stringify(subscription.toJSON(), null, 2));
      window.location.reload();
    } catch (e: any) {
      setTestResult(`Fehler: ${e.message}\n${e.stack}`);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Push Notification Debug</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">System Info</h2>
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(info).map(([key, value]) => (
              <tr key={key} className="border-b">
                <td className="py-2 font-medium">{key}</td>
                <td className="py-2 text-right">
                  {typeof value === "boolean" ? (
                    <span className={value ? "text-green-600" : "text-red-600"}>
                      {value ? "✓ Ja" : "✗ Nein"}
                    </span>
                  ) : (
                    <span className="text-gray-600 break-all">{String(value)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Tests</h2>
        <div className="space-y-2">
          <button
            onClick={requestPermission}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            1. Berechtigung anfragen
          </button>
          <button
            onClick={subscribe}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            2. Push Subscribe
          </button>
          <button
            onClick={testLocalNotification}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
          >
            3. Test: Lokale Notification
          </button>
          <button
            onClick={testServiceWorkerNotification}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600"
          >
            4. Test: SW Notification
          </button>
          <button
            onClick={testServerPush}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            5. Test: Server Push
          </button>
        </div>
      </div>

      {testResult && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h2 className="font-semibold mb-2">Ergebnis:</h2>
          <pre className="text-sm whitespace-pre-wrap break-all">{testResult}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">iOS Checkliste:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>iOS 16.4 oder neuer</li>
          <li>App zum Home-Bildschirm hinzugefügt</li>
          <li>App vom Home-Bildschirm geöffnet (nicht Safari)</li>
          <li>Standalone Mode = Ja (siehe oben)</li>
          <li>Berechtigung = granted</li>
        </ul>
      </div>
    </div>
  );
}
