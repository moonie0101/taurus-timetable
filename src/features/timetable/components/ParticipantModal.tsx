import React, { useEffect, useState } from "react";
import { Lock, Trash2, User } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { useAuth } from "../../../context/AuthContext";

export function ParticipantModal({
  isOpen,
  onClose,
  currentName,
  onVerifyOrEnter,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentName?: string | null;
  onVerifyOrEnter: (name: string, password: string) => Promise<void>;
  onDelete?: (name: string, password: string) => Promise<void>;
}) {
  const { teamName, teamPassword } = useAuth();
  const [name, setName] = useState(currentName || teamName || "");
  const [password, setPassword] = useState(teamPassword || "");
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName((prev) => currentName || prev || teamName || "");
      setPassword((prev) => prev || teamPassword || "");
      setShowDeleteSection(false);
    }
  }, [isOpen, currentName, teamName, teamPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("닉네임(또는 팀명)을 입력해 주세요.");
      return;
    }
    if (!password.trim()) {
      alert("비밀번호를 입력해 주세요.");
      return;
    }
    try {
      setSubmitting(true);
      await onVerifyOrEnter(name.trim(), password.trim());
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "참여 확인에 실패했습니다.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!name.trim() || !password.trim()) {
      alert("삭제할 닉네임과 비밀번호를 입력해 주세요.");
      return;
    }
    try {
      setSubmitting(true);
      await onDelete(name.trim(), password.trim());
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "참여 삭제에 실패했습니다.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentName ? "내 일정 변경 / 삭제" : "참여 / 내 일정 입력"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="닉네임 (또는 팀명)"
          placeholder="예: 김영훈 또는 토러스"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User className="w-4 h-4" />}
          maxLength={20}
        />
        <Input
          label="비밀번호"
          type="password"
          placeholder="수정 시 사용할 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          maxLength={32}
        />

        <div className="text-xs text-text-sub space-y-1 pt-1">
          <p>* 회원가입 없이 닉네임과 비밀번호만으로 바로 일정을 등록합니다.</p>
          <p>* 이미 등록한 이름과 같은 비밀번호를 입력하면 기존 일정을 불러와 수정합니다.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </Button>
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "확인 중..." : currentName ? "불러오기 / 변경" : "참여하기"}
          </Button>
        </div>

        {/* Delete participant entry only shown clearly for existing participants (or via subtle toggle) */}
        {onDelete && (currentName || showDeleteSection) && (
          <div className="pt-3 border-t border-border">
            <Button
              type="button"
              variant="danger"
              size="sm"
              fullWidth
              onClick={handleDelete}
              disabled={submitting}
              className="gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              이 시간표에서 내 참여 기록 완전히 삭제하기
            </Button>
          </div>
        )}

        {onDelete && !currentName && !showDeleteSection && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowDeleteSection(true)}
              className="text-[11px] text-text-muted hover:text-text-sub underline cursor-pointer"
            >
              이미 등록한 내 참여 기록을 삭제하고 싶으신가요?
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
