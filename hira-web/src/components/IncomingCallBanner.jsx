import Avatar from "./Avatar";
import Button from "./Button";
import { useCall } from "../context/CallContext";
import "./IncomingCallBanner.css";

const ICON_PHONE = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
  </svg>
);

const ICON_PHONE_OFF = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 1 1 23" strokeLinecap="round" />
  </svg>
);

export default function IncomingCallBanner() {
  const { callStatus, callInfo, acceptCall, rejectCall } = useCall();

  if (callStatus !== "ringing") return null;

  return (
    <div className="incoming-call">
      <Avatar name={callInfo.name} avatarUrl={callInfo.avatarUrl} size={52} />
      <div className="incoming-call__info">
        <p className="incoming-call__name">{callInfo.name}</p>
        <p className="incoming-call__type">
          {callInfo.callType === "video" ? "Appel vidéo entrant..." : "Appel audio entrant..."}
        </p>
      </div>
      <div className="incoming-call__actions">
        <button className="incoming-call__btn incoming-call__btn--reject" onClick={rejectCall} aria-label="Refuser">
          {ICON_PHONE_OFF}
        </button>
        <button className="incoming-call__btn incoming-call__btn--accept" onClick={acceptCall} aria-label="Accepter">
          {ICON_PHONE}
        </button>
      </div>
    </div>
  );
}
