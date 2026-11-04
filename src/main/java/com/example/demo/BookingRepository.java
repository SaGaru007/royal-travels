package com.example.demo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findAllByOrderByCreatedAtDesc();

    // Params are always passed as non-null strings (empty string means "no
    // filter"). Using `:q is null` here makes PostgreSQL infer the null bind
    // parameter as bytea, which breaks lower().
    @Query("""
            select b from Booking b
            where (:status = '' or b.status = :status)
              and (:q = ''
                   or lower(b.name) like lower(concat('%', :q, '%'))
                   or b.phone like concat('%', :q, '%')
                   or lower(coalesce(b.email, '')) like lower(concat('%', :q, '%')))
            """)
    Page<Booking> search(@Param("status") String status, @Param("q") String q, Pageable pageable);
}
