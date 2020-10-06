#include "pxt.h"

#define PXT_COMM_SIZE 2048
#define PXT_COMM_BASE 0x20001000 // 4k in

namespace edgeimpulse {

#define IFACE_MAGIC 0x30564945

struct import_vectors {
    void (*abort)();
    void *(*realloc)(void *ptr, size_t sz);
    int (*vprintf)(const char *fmt, va_list ap);
    int (*get_time_ms)();
    uint64_t (*get_time_us)();
    uint32_t paddingInterface[32 - 6];
};

struct interface_vectors {
    uint32_t magic;
    uint32_t text_base;
    uint32_t ram_start;
    uint32_t ram_end;

    struct import_vectors imports;

    uint32_t frames_in_window;
    uint32_t channels;
    uint32_t sampling_interval_ms;
    uint32_t num_classifier_labels;
    uint32_t has_anomaly;
    const char **labels;
    uint32_t paddingAttributes[32 - 6];

    void (*ei_init)(void *comm_data, uint32_t comm_size);
    int (*ei_classify)(const float *data, unsigned numdata, float *classification);
    uint32_t paddingEntries[14];
};

//%
uint32_t _pxt_comm_base() {
    return PXT_COMM_BASE;
}

static void my_abort() {
    target_panic(PANIC_VM_ERROR);
}

static void *my_realloc(void *ptr, size_t size) {
    if (!ptr)
        return malloc(size);
    if (!size) {
        free(ptr);
        return NULL;
    }
    return realloc(ptr, size);
}

static int my_vprintf(const char *fmt, va_list ap) {
    codal_vdmesg(fmt, true, ap);
    return 0;
}

//%
void _updateImports(Buffer buf) {
    interface_vectors *vectors = (interface_vectors *)buf->data;
    vectors->imports.abort = my_abort;
    vectors->imports.realloc = my_realloc;
    vectors->imports.vprintf = my_vprintf;
    vectors->imports.get_time_ms = pxt::current_time_ms;
    vectors->imports.get_time_us = pxt::current_time_us;
}

//%
int _invokeModel(Buffer model, Buffer inputs, Buffer results) {
    static uint8_t initCalled;

    interface_vectors *vectors = (interface_vectors *)model->data;

    if (!initCalled) {
        initCalled = 1;
        vectors->ei_init((void *)_pxt_comm_base(), PXT_COMM_SIZE);
    }

    if (results->length < (int)(vectors->num_classifier_labels * sizeof(float)))
        my_abort();

    return vectors->ei_classify((float *)inputs->data, inputs->length >> 2, (float *)results->data);
}

} // namespace edgeimpulse
