"use client";

import { deleteIuran } from "@/app/actions/kas";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteIuranButton({
  iuranId,
  name,
}: {
  iuranId: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Hapus
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Hapus iuran?"
        description={`Iuran “${name}” dan status bayar terkait akan dihapus permanen.`}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={pending}
            onClick={() => {
              start(async () => {
                const fd = new FormData();
                fd.set("iuranId", iuranId);
                await deleteIuran(fd);
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {pending ? "Menghapus…" : "Ya, hapus"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
