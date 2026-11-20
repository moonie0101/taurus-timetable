import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teamApi } from "../api/taurusApi";
import { ReservationHistoryList } from "../components/reservation/ReservationComponents";
import { Button } from "../components/ui/Button";
import { SettingRow } from "../components/ui/Card";
import { InlineAlert } from "../components/ui/InlineAlert";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PageContainer, PageHeader, Typography } from "../components/ui/Typography";
import { useAuth } from "../context/AuthContext";
import { useReservations, useTeamManagement } from "../hooks/useTaurusHooks";
import dayjs from "../lib/dayjs";

export function TeamManagePage() {
  const navigate = useNavigate();
  const { logoutTeam } = useAuth();
  const {
    myTeam,
    loading: teamLoading,
    fetchMyTeam,
    deleteTeam,
  } = useTeamManagement();
  const {
    myReservations,
    loading: resLoading,
    getMyReservations,
    cancelReservation,
  } = useReservations();

  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedResIds, setSelectedResIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<"name" | "password">("name");
  const [newValue, setNewValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyTeam();
    getMyReservations();
  }, [fetchMyTeam, getMyReservations]);

  const handleCancelReservation = useCallback(
    async (id: string) => {
      try {
        await cancelReservation(id);
        await getMyReservations();
      } catch (err: unknown) {
        const status =
          (err as { response?: { status?: number } }).response?.status || 500;
        throw new Error(String(status));
      }
    },
    [cancelReservation, getMyReservations]
  );

  const handleDeleteTeam = useCallback(async () => {
    if (confirm("정말로 팀을 삭제하시겠습니까? 예약된 내역도 모두 삭제됩니다.")) {
      try {
        setIsDeleting(true);
        await deleteTeam();
        logoutTeam();
        alert("팀이 삭제되었습니다.");
        navigate("/");
      } catch (err) {
        console.error(err);
        alert("팀 삭제에 실패했습니다.");
      } finally {
        setIsDeleting(false);
      }
    }
  }, [deleteTeam, logoutTeam, navigate]);

  const handleLogout = useCallback(() => {
    logoutTeam();
    navigate("/");
  }, [logoutTeam, navigate]);

  const openEditModal = (mode: "name" | "password") => {
    setEditMode(mode);
    setNewValue("");
    setCurrentPassword("");
    setModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editMode === "name") {
        await teamApi.updateName(newValue);
        alert("팀 이름이 변경되었습니다.");
      } else {
        if (!currentPassword) {
          alert("현재 비밀번호를 입력해주세요.");
          return;
        }
        await teamApi.updatePassword(currentPassword, newValue);
        alert("비밀번호가 변경되었습니다.");
      }
      setModalOpen(false);
      fetchMyTeam();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "수정에 실패했습니다.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const loading = teamLoading || resLoading;

  if (loading && !myTeam) {
    return <div className="p-6 text-center text-text-sub">로딩 중...</div>;
  }

  if (!myTeam) return null;

  return (
    <PageContainer>
      <PageHeader
        title="팀 관리"
        description="팀 이름 및 비밀번호 변경"
        action={
          <Button variant="outline" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        }
      />

      <div className="space-y-12">
        <section>
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex flex-col justify-between gap-2">
              <Typography variant="subtitle">{myTeam.name}</Typography>
              <Typography variant="caption">
                등록일: {dayjs(myTeam.createdAt).format("YYYY-MM-DD HH:mm:ss")}
              </Typography>
              <div className="flex items-center justify-end gap-4 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal("name")}
                >
                  이름 변경
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal("password")}
                >
                  비밀번호 변경
                </Button>
              </div>
            </div>
          </div>
        </section>

        <ReservationHistoryList
          reservations={myReservations}
          loading={loading}
          onCancel={handleCancelReservation}
          selectable
          selectedIds={selectedResIds}
          onSelectionChange={setSelectedResIds}
        />

        <div className="mt-12 pt-8 border-t border-white/15">
          <InlineAlert variant="error" title="WARNING">
            <SettingRow
              label="팀 삭제 및 탈퇴"
              description="팀을 삭제하면 모든 예약 내역과 정보가 영구적으로 사라집니다."
              className="border-0! p-0!"
            >
              <Button
                variant="danger"
                onClick={handleDeleteTeam}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "팀 삭제"}
              </Button>
            </SettingRow>
          </InlineAlert>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode === "name" ? "팀 이름 변경" : "비밀번호 변경"}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editMode === "password" && (
            <Input
              label="현재 비밀번호"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="현재 비밀번호를 입력하세요"
            />
          )}
          <Input
            label={editMode === "name" ? "새로운 팀 이름" : "새로운 비밀번호"}
            type={editMode === "name" ? "text" : "password"}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            required
            placeholder={
              editMode === "name"
                ? "변경할 팀 이름을 입력하세요"
                : "새로운 비밀번호 4자리"
            }
            maxLength={editMode === "password" ? 32 : undefined}
          />
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => setModalOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" fullWidth disabled={submitting}>
              {editMode === "name" ? "변경" : "저장"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
