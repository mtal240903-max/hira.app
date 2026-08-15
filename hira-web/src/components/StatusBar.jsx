import Avatar from "./Avatar";
import "./StatusBar.css";

const ICON_PLUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

export default function StatusBar({ groups, myUserId, onAddStatus, onOpenGroup }) {
  const myGroup = groups.find((g) => g.user._id === myUserId);
  const otherGroups = groups.filter((g) => g.user._id !== myUserId);

  const hasUnseen = (group) =>
    group.statuses.some((s) => !s.viewers.some((v) => v.user._id === myUserId));

  return (
    <div className="status-bar">
      <button className="status-bar__item" onClick={() => (myGroup ? onOpenGroup(myGroup) : onAddStatus())}>
        <div className="status-bar__avatar-wrap">
          <Avatar name="Mon statut" avatarUrl={myGroup?.user.avatarUrl} size={52} />
          <span className="status-bar__add-badge" onClick={(e) => { e.stopPropagation(); onAddStatus(); }}>
            {ICON_PLUS}
          </span>
        </div>
        <span className="status-bar__label">Mon statut</span>
      </button>

      {otherGroups.map((group) => (
        <button key={group.user._id} className="status-bar__item" onClick={() => onOpenGroup(group)}>
          <div className={`status-bar__ring ${hasUnseen(group) ? "status-bar__ring--unseen" : "status-bar__ring--seen"}`}>
            <Avatar name={group.user.name} avatarUrl={group.user.avatarUrl} size={48} />
          </div>
          <span className="status-bar__label">{group.user.name.split(" ")[0]}</span>
        </button>
      ))}
    </div>
  );
}
