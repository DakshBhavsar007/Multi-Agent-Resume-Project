import {create} from 'zustand'

export const useIngestStore = create((set) => ({
  jobs: {},
  addJob: (id,type) => set(s => ({
    jobs:{...s.jobs,[id]:{id,type,status:"pending",
                          total:0,processed:0,failed:0}}
  })),
  updateJob: (id,data) => set(s => ({
    jobs: {
      ...s.jobs,
      [id]: {
        ...s.jobs[id],
        ...data,
        total: data.total_files !== undefined ? data.total_files : s.jobs[id].total,
        processed: data.processed_files !== undefined ? data.processed_files : s.jobs[id].processed,
        failed: data.failed_files !== undefined ? data.failed_files : s.jobs[id].failed
      }
    }
  })),
  removeJob: (id) => set(s => {
    const j={...s.jobs}; delete j[id]; return {jobs:j}
  })
}))
