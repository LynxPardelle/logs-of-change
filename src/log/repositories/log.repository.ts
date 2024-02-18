export default class LogRepository {
  logDAO: { [key: string]: any };
  constructor(logDAO) {
    this.logDAO = logDAO;
  }
  /* Create */
  createLog(log: { [key: string]: any }) {
    return this.logDAO.create(log);
  }
  /* Read */
  getLogs() {
    return this.logDAO.find();
  }
  getLogById(logId: string) {
    return this.logDAO.findById(logId);
  }
  /* Update */
  updateLog(log: { [key: string]: any }) {
    return this.logDAO.update(log);
  }
  /* Delete */
  deleteLog(logId: string) {
    return this.logDAO.delete(logId);
  }
}
